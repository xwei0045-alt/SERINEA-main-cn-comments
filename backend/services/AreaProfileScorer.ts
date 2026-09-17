import type { AreaProfile, AreaProfileEvidence } from "@/backend/repositories/AreaProfileRepository";

export const PROFILE_DIMENSION_WEIGHTS = {
  employmentIndustry: 0.25,
  incomeEconomic: 0.20,
  demographic: 0.15,
  socioeconomic: 0.15,
  communityCulture: 0.10,
  regionalCapacity: 0.10,
  dataQuality: 0.05
} as const;

export type ProfileDimension = keyof typeof PROFILE_DIMENSION_WEIGHTS;
export type ProfileDimensionResult = Record<ProfileDimension, { score: number; weight: number }>;

const ageCountFields = ["age_0_4_count", "age_5_14_count", "age_15_19_count", "age_20_24_count", "age_25_34_count", "age_35_44_count", "age_45_54_count", "age_55_64_count", "age_65_74_count", "age_75_84_count", "age_85_plus_count"];
const agePctFields = ageCountFields.map((field) => field.replace("_count", "_pct"));
const communityBases = ["australian_ancestry", "english_ancestry", "chinese_ancestry", "indian_ancestry", "vietnamese_ancestry", "australia_born", "china_born", "india_born", "vietnam_born", "english_only_home", "mandarin_home", "cantonese_home", "vietnamese_home"];
const industryBases = ["agriculture", "mining", "manufacturing", "utilities", "construction", "wholesale", "retail", "accommodation_food", "transport_warehousing", "information_media", "finance_insurance", "rental_real_estate", "professional_services", "admin_support", "public_admin", "education", "healthcare_social_assistance", "arts_recreation", "other_services"];

const dimensionFields: Record<ProfileDimension, string[]> = {
  employmentIndustry: [
    "employed_worked_full_time_count", "employed_worked_part_time_count",
    "employed_away_from_work_count", "unemployed_count", "unemployment_rate_pct",
    "labour_force_participation_pct", "employment_to_population_pct",
    ...industryBases.flatMap((base) => [`${base}_employee_jobs`, `${base}_share_pct`])
  ],
  incomeEconomic: [
    "census_median_personal_income_weekly_aud", "census_median_household_income_weekly_aud",
    "mean_total_income_aud", "median_total_income_aud", "mean_employee_income_aud",
    "median_employee_income_aud"
  ],
  demographic: ["median_age_years", ...ageCountFields, ...agePctFields, "under_15_pct", "age_65_plus_pct"],
  socioeconomic: ["irsad_score", "irsad_decile", "ier_score", "ier_decile"],
  communityCulture: communityBases.flatMap((base) => [`${base}_count`, `${base}_pct`]),
  regionalCapacity: [
    "census_population", "labour_force_count", "census_employed_count", "total_income_earners",
    "employee_income_earners", "total_jobs", "employee_jobs_total"
  ],
  dataQuality: [
    "census_pct_quality", "census_year", "census_source", "income_year", "income_source",
    "jobs_year", "jobs_source", "seifa_year", "seifa_source", "seifa_status"
  ]
};

const countLike = /(?:_count|_jobs|_earners|population|total_jobs|employee_jobs_total)$/;
const inverseFields = new Set(["unemployed_count", "unemployment_rate_pct"]);

// 作用：实现 numeric 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
function numeric(profile: AreaProfile, field: string): number | null {
  // 只接受有限数字，避免缺失值或文本字段参与数学计算。
  const value = profile.attributes[field];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// 作用：实现 clamp 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
function clamp(value: number): number {
  // 将画像维度分数限制在 0 到 100。
  return Math.max(0, Math.min(100, value));
}

// 把当前区域字段与同层级区域比较，生成相对百分比分数；失业类指标反向计分。
function relativeFieldScore(profile: AreaProfile, peers: AreaProfile[], field: string): number | null {
  const value = numeric(profile, field);
  if (value == null) return null;
  const transform = (item: number) => countLike.test(field) ? Math.log1p(Math.max(0, item)) : item;
  const values = peers.map((peer) => numeric(peer, field)).filter((item): item is number => item != null).map(transform);
  if (!values.length) return null;
  const current = transform(value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (maximum === minimum) return 50;
  const normalised = ((current - minimum) / (maximum - minimum)) * 100;
  return inverseFields.has(field) ? 100 - normalised : normalised;
}

// 用熵衡量多个类别的分布均衡程度，并归一化为 0 到 100 分。
function evenness(profile: AreaProfile, fields: string[]): number | null {
  const values = fields.map((field) => numeric(profile, field)).filter((value): value is number => value != null && value > 0);
  if (values.length < 2) return values.length ? 0 : null;
  const total = values.reduce((sum, value) => sum + value, 0);
  const entropy = -values.reduce((sum, value) => {
    const share = value / total;
    return sum + share * Math.log(share);
  }, 0);
  return clamp((entropy / Math.log(values.length)) * 100);
}

// 作用：实现 qualityScore 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
function qualityScore(profile: AreaProfile): number {
  // 根据字段年份、来源和质量状态计算画像数据质量分数。
  const expectedYears: Record<string, number> = { census_year: 2021, seifa_year: 2021, income_year: 2023, jobs_year: 2023 };
  const scores = dimensionFields.dataQuality.flatMap((field) => {
    const value = profile.attributes[field];
    if (value == null || value === "") return [];
    if (field in expectedYears) return [Number(value) === expectedYears[field] ? 100 : 50];
    if (field.endsWith("_source")) return [100];
    if (field === "census_pct_quality") return [value === "ok" ? 100 : value === "small_population" ? 60 : 25];
    if (field === "seifa_status") return [value === "available" ? 100 : value === "partial" ? 60 : 0];
    return [100];
  });
  return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
}

// 作用：实现 oneLevelScore 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
function oneLevelScore(profile: AreaProfile, peers: AreaProfile[], dimension: ProfileDimension): number {
  // 在一个地理层级内计算指定画像维度，再合并该维度的字段分数。
  if (dimension === "dataQuality") return qualityScore(profile);
  if (dimension === "demographic") {
    const vectorScores = [evenness(profile, ageCountFields), evenness(profile, agePctFields)].filter((value): value is number => value != null);
    const remaining = ["median_age_years", "under_15_pct", "age_65_plus_pct"]
      .map((field) => relativeFieldScore(profile, peers, field)).filter((value): value is number => value != null);
    const scores = [...vectorScores, ...remaining];
    return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
  }
  if (dimension === "communityCulture") {
    const countScore = evenness(profile, communityBases.map((base) => `${base}_count`));
    const pctScore = evenness(profile, communityBases.map((base) => `${base}_pct`));
    const scores = [countScore, pctScore].filter((value): value is number => value != null);
    return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
  }
  const scores = dimensionFields[dimension]
    .map((field) => relativeFieldScore(profile, peers, field))
    .filter((value): value is number => value != null);
  return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
}

// 作用：实现 combineLevels 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
function combineLevels(sal: number | null, lga: number | null): number {
  // 优先按 SAL 60% 与 LGA 40% 合并；缺少一层时使用另一层结果。
  if (sal != null && lga != null) return sal * 0.6 + lga * 0.4;
  return sal ?? lga ?? 0;
}

// 对所有区域画像计算各维度及总分，并记录实际可用字段数量。
export function scoreAreaProfiles(evidence: AreaProfileEvidence[]): Array<{
  score: number;
  dimensions: ProfileDimensionResult;
  fieldUsage: { uniqueFieldsUsed: number; availableValues: number; totalValues: number };
}> {
  const salPeers = evidence.map((item) => item.sal).filter((item): item is AreaProfile => item != null);
  const lgaPeers = evidence.map((item) => item.lga).filter((item): item is NonNullable<AreaProfileEvidence["lga"]> => item != null);
  const allDesignedFields = new Set(Object.values(dimensionFields).flat());

  return evidence.map((item) => {
    const dimensions = Object.fromEntries((Object.keys(PROFILE_DIMENSION_WEIGHTS) as ProfileDimension[]).map((dimension) => {
      const sal = item.sal ? oneLevelScore(item.sal, salPeers, dimension) : null;
      const lga = item.lga ? oneLevelScore(item.lga, lgaPeers, dimension) : null;
      return [dimension, { score: combineLevels(sal, lga), weight: PROFILE_DIMENSION_WEIGHTS[dimension] }];
    })) as ProfileDimensionResult;
    const score = (Object.keys(dimensions) as ProfileDimension[])
      .reduce((sum, dimension) => sum + dimensions[dimension].score * dimensions[dimension].weight, 0);
    const values = [item.sal, item.lga].filter((profile): profile is AreaProfile => profile != null)
      .flatMap((profile) => [...allDesignedFields].map((field) => profile.attributes[field]));
    return {
      score,
      dimensions,
      fieldUsage: {
        uniqueFieldsUsed: allDesignedFields.size + 4,
        availableValues: values.filter((value) => value != null && value !== "").length,
        totalValues: values.length
      }
    };
  });
}

// 删除内部完整字段字典，只向浏览器返回可公开展示的画像摘要。
export function publicProfile<T extends AreaProfile>(profile: T | null): Omit<T, "attributes"> | null {
  if (!profile) return null;
  const { attributes: _attributes, ...summary } = profile;
  return summary;
}
