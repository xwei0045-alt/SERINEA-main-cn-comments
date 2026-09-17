import type {
  IncentiveRequest,
  IncentiveResponse,
  IncentiveResultItem,
  IncentiveStatus
} from "@/shared/contracts/incentives";
import {
  PostgresSubsidyRepository,
  type SubsidyRecord,
  type SubsidyRepository
} from "@/backend/repositories/SubsidyRepository";


type CheckResult = {
  matched: string[];
  missing: string[];
  failed: string[];
};

// 统一职业名称和限制文本的大小写与空格，便于不区分大小写比较。
function normalizeOccupation(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-AU");
}

// 只执行补贴目录中明确给出的职业限制，不为缺失的政策数据臆造规则。
function checkOccupation(restriction: string | null, occupation: string | null): CheckResult {
  const rule = restriction ? normalizeOccupation(restriction) : "";
  if (!rule || rule === "none" || rule === "all") return { matched: [], missing: [], failed: [] };
  if (!occupation) return { matched: [], missing: ["Occupation"], failed: [] };
  const requested = normalizeOccupation(occupation);
  const allowed = rule.split(/[;,|/]/).map(normalizeOccupation).filter(Boolean);
  return allowed.some((item) => item === requested || item.includes(requested) || requested.includes(item))
    ? { matched: ["Occupation"], missing: [], failed: [] }
    : { matched: [], missing: [], failed: ["Occupation"] };
}

const CATEGORY_TERMS: Record<string, string[]> = {
  relocation: ["moving cost", "moving expense", "relocation support", "relocation grant"],
  housing_setup: ["housing support", "home setup", "settling support", "household essentials"],
  childcare: ["childcare", "daycare", "kindergarten", "young child"],
  school_support: ["school", "student", "education", "school supplies"],
  transport: ["transport", "travel", "journey", "commute"],
  accessibility: ["accessibility", "disability", "mobility", "wheelchair"],
  healthcare: ["health", "medical", "doctor", "dentist", "pharmacy", "prescription"],
  sport: ["sport", "gym", "fitness", "exercise"],
  energy: ["energy", "electricity", "efficiency", "solar"],
  digital: ["digital", "computer", "device", "internet"],
  community: ["community", "class", "activity", "participation"]
};

const NOTICE = "Fictional subsidy data for SERINEA prototype testing only. These are not government programs or official eligibility decisions.";

// 统一地点名称的空格和大小写，确保用户输入能与目录字段匹配。
function normalizeArea(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleUpperCase("en-AU");
}

// 转义地点文本中的正则特殊字符，保证后续搜索按字面量执行。
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 判断用户消息是否提到指定地点，支持名称中的空格变化。
function containsArea(message: string, area: string): boolean {
  return new RegExp(`\\b${escapeRegExp(area).replaceAll("\\ ", "\\s+")}\\b`, "i").test(message);
}

// 将年、月或周收入统一换算为年度金额，供补贴上限比较。
function toAnnualIncome(
  amount: number,
  period: IncentiveRequest["profile"]["income_period"]
): number | null {
  if (period === "annual") return amount;
  if (period === "monthly") return amount * 12;
  if (period === "weekly") return amount * 52;
  return null;
}

// 根据用户消息中的关键词提取补贴类别，结果用于缩小政策候选范围。
function categoriesIn(message: string): Set<string> {
  const normalized = message.toLocaleLowerCase("en-AU");
  return new Set(Object.entries(CATEGORY_TERMS)
    .filter(([, terms]) => terms.some((term) => normalized.includes(term)))
    .map(([category]) => category));
}

// 用 Haversine 公式计算地点与墨尔本之间的球面距离，单位为公里。
function distanceFromMelbourne(lat: number, lon: number): number {
  const melbourneLat = -37.8136;
  const melbourneLon = 144.9631;
  const R = 6371; // Earth's radius in km
  const dLat = (lat - melbourneLat) * Math.PI / 180;
  const dLon = (lon - melbourneLon) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(melbourneLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export class IncentiveService {
  private recordsPromise: Promise<SubsidyRecord[]> | undefined;
  private recordsLoadedAt = 0;

  // 注入补贴仓储和缓存时间，默认使用 PostgreSQL 仓储。
  constructor(
    private readonly repository: SubsidyRepository = new PostgresSubsidyRepository(),
    private readonly cacheTtlMs = 5 * 60 * 1000,
    private readonly now = Date.now
  ) {}

  // 读取并缓存补贴记录，按地点、类别和用户资格条件返回筛选结果。
  async find(input: IncentiveRequest): Promise<IncentiveResponse> {
    const records = await this.load();
    let requestedAreas = input.towns.length
      ? input.towns.map((town) => ({
          locality: normalizeArea(town.locality),
          lgaName: normalizeArea(town.lgaName),
          source: "lifestyle_ranking" as const
        }))
      : this.areaFromMessage(input.message, input.profile.locality, input.profile.lga_name, records);

    if (requestedAreas.length === 0 && (!input.towns.length && !input.profile.locality)) {
      let eligibleRecords = records;
      
      if (input.profile.move_distance_km != null) {
        eligibleRecords = eligibleRecords.filter(r => 
          r.anchorLatitude != null && r.anchorLongitude != null &&
          distanceFromMelbourne(r.anchorLatitude, r.anchorLongitude) <= input.profile.move_distance_km!
        );
      }

      const lgaStats = new Map<string, { locality: string, totalAmount: number, distance: number }>();
      
      for (const record of eligibleRecords) {
        if (!lgaStats.has(record.lgaName)) {
          lgaStats.set(record.lgaName, {
            locality: record.locality,
            totalAmount: 0,
            distance: (record.anchorLatitude != null && record.anchorLongitude != null) 
              ? distanceFromMelbourne(record.anchorLatitude, record.anchorLongitude) 
              : 9999
          });
        }
        
        const check = this.check(record, input);
        if (check.failed.length === 0) {
          lgaStats.get(record.lgaName)!.totalAmount += record.maxAmountAud;
        }
      }

      const rankedLgas = [...lgaStats.entries()]
        .sort((a, b) => {
          if (b[1].totalAmount !== a[1].totalAmount) {
            return b[1].totalAmount - a[1].totalAmount;
          }
          return a[1].distance - b[1].distance;
        })
        .slice(0, 5); // Pick top 5 LGAs

      requestedAreas = rankedLgas.map(([lgaName, stats]) => ({
        locality: stats.locality,
        lgaName,
        source: "named_area_query" as const
      }));
    }

    const wantedCategories = categoriesIn(input.message);
    const groups = requestedAreas.map((area) => {
      const candidates = records
        .filter((record) => record.locality === area.locality && record.lgaName === area.lgaName)
        .filter((record) => record.mockStatus !== "mock_closed")
        .filter((record) => wantedCategories.size === 0 || wantedCategories.has(record.category))
        .map((record) => ({ record, check: this.check(record, input) }))
        .filter(({ check }) => check.failed.length === 0)
        .map(({ record, check }) => this.toResult(record, check, input.relocationStage))
        .sort((first, second) =>
          second.matched.length - first.matched.length ||
          first.missing.length - second.missing.length ||
          Number(first.mockStatus === "mock_upcoming") - Number(second.mockStatus === "mock_upcoming") ||
          second.maxAmountAud - first.maxAmountAud ||
          first.subsidyId.localeCompare(second.subsidyId)
        )
        .slice(0, input.limitPerTown);
      return { ...area, items: candidates };
    });

    return {
      groups,
      queryArea: input.towns.length
        ? null
        : requestedAreas.length > 1 ? requestedAreas[0]?.lgaName ?? null : requestedAreas[0]?.locality ?? null,
      needsAreaOrLifestyle: requestedAreas.length === 0,
      dataSource: this.repository.dataSource,
      isSynthetic: true,
      recordNotice: NOTICE,
      generatedAt: new Date().toISOString()
    };
  }

  private areaFromMessage(
    message: string,
    profileLocality: string | null,
    profileLga: string | null,
    records: SubsidyRecord[]
  ): Array<{ locality: string; lgaName: string; source: "named_area_query" }> {
    const localities = [...new Set(records.map((record) => record.locality))]
      .sort((first, second) => second.length - first.length);
    const locality = profileLocality
      ? normalizeArea(profileLocality)
      : localities.find((candidate) => containsArea(message, candidate));
    if (locality) {
      const normalizedProfileLga = profileLga ? normalizeArea(profileLga) : null;
      const matches = records.filter((record) =>
        record.locality === locality &&
        (normalizedProfileLga == null || record.lgaName === normalizedProfileLga)
      );
      return [...new Map(matches.map((record) => [record.lgaName, record])).values()]
        .map((record) => ({ locality: record.locality, lgaName: record.lgaName, source: "named_area_query" as const }));
    }

    const lgas = [...new Set(records.map((record) => record.lgaName))]
      .sort((first, second) => second.length - first.length);
    const lga = profileLga
      ? normalizeArea(profileLga)
      : lgas.find((candidate) => containsArea(message, candidate));
    if (!lga) return [];
    return [...new Map(
      records.filter((record) => record.lgaName === lga)
        .map((record) => [record.locality, record])
    ).values()]
      .map((record) => ({ locality: record.locality, lgaName: record.lgaName, source: "named_area_query" as const }))
      .slice(0, 5);
  }

  // 作用：实现 check 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  private check(record: SubsidyRecord, input: IncentiveRequest): CheckResult {
    const { profile, relocationStage } = input;
    const matched = ["Locality"];
    const missing: string[] = [];
    const failed: string[] = [];

    const occupation = checkOccupation(record.occupationRestriction, profile.occupation);
    matched.push(...occupation.matched);
    missing.push(...occupation.missing);
    failed.push(...occupation.failed);

    if (record.ageSubject === "applicant") {
      if (profile.age == null) missing.push("Applicant age");
      else {
        if (record.ageMin != null && profile.age < record.ageMin) failed.push("Minimum age");
        if (record.ageMax != null && profile.age > record.ageMax) failed.push("Maximum age");
        if (!failed.some((item) => item.includes("age"))) matched.push("Applicant age");
      }
    } else if (profile.has_child === false) {
      failed.push("Dependent child required");
    } else if (profile.child_ages.length === 0) {
      missing.push("Dependent child's age");
    } else if (profile.child_ages.some((age) =>
      (record.ageMin == null || age >= record.ageMin) &&
      (record.ageMax == null || age <= record.ageMax)
    )) matched.push("Dependent child's age");
    else failed.push("Dependent child's age");

    if (record.incomeLimitAnnual != null) {
      if (profile.income == null) missing.push("Income amount");
      else if (profile.income_scope !== record.incomeAssessmentUnit) {
        missing.push(`${record.incomeAssessmentUnit === "household" ? "Household" : "Individual"} income scope`);
      } else if (profile.income_period === "unknown") missing.push("Income period");
      else if (profile.income_basis !== "gross") missing.push("Gross income confirmation");
      else {
        const annualIncome = toAnnualIncome(profile.income, profile.income_period);
        if (annualIncome != null && annualIncome <= record.incomeLimitAnnual) matched.push("Annual gross income");
        else failed.push("Income limit");
      }
    }

    if (relocationStage === "unknown") missing.push("Relocation stage");
    return { matched, missing: [...new Set(missing)], failed: [...new Set(failed)] };
  }

  private toResult(
    record: SubsidyRecord,
    check: CheckResult,
    stage: IncentiveRequest["relocationStage"]
  ): IncentiveResultItem {
    const status: IncentiveStatus = stage === "planning_to_move"
      ? "Potential Incentive"
      : check.missing.length > 0 ? "More Information Needed" : "Possible Match";
    return {
      subsidyId: record.subsidyId,
      subsidyName: record.subsidyName.replace(/^\[MOCK\]\s*/i, ""),
      category: record.category,
      benefitType: record.benefitType,
      maxAmountAud: record.maxAmountAud,
      status,
      mockStatus: record.mockStatus === "mock_upcoming" ? "mock_upcoming" : "mock_open",
      matched: check.matched,
      missing: check.missing,
      eligibilitySummary: record.eligibilitySummary,
      requiredEvidence: record.requiredEvidence
    };
  }

  // 作用：实现 load 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  private load(): Promise<SubsidyRecord[]> {
    if (!this.recordsPromise || this.now() - this.recordsLoadedAt >= this.cacheTtlMs) {
      this.recordsLoadedAt = this.now();
      this.recordsPromise = this.repository.load().catch((error) => {
        this.recordsPromise = undefined;
        this.recordsLoadedAt = 0;
        throw error;
      });
    }
    return this.recordsPromise;
  }
}

