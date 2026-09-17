import { RANKING_PREFERENCES } from "@/lib/types";
import { LocalitySummaryServiceFactory } from "@/backend/factories/LocalitySummaryServiceFactory";
import { PostgresComparePoiLoader, type ComparePoi } from "@/backend/repositories/PostgresComparePoiLoader";
import { CsvDatasetLoader } from "@/backend/test-support/CsvDatasetLoader";
import { dedupeRegionalPois } from "@/backend/data/poiDedupe";
import { haversineKm } from "@/lib/geo";
import type {
  CompareQuery,
  CompareRankItem,
  CompareResponse
} from "@/shared/contracts/compare";
import type { LocalitySummaryItem } from "@/shared/contracts/localities";
import {
  areaProfileKey,
  type AreaProfileEvidence,
  type AreaProfileRepository
} from "@/backend/repositories/AreaProfileRepository";
import { publicProfile, scoreAreaProfiles } from "./AreaProfileScorer";

const RANKING_WEIGHTS = {
  userNeeds: 0.75,
  poiCoverage: 0.15,
  areaProfile: 0.10
} as const;

// 将中间分数限制在对外展示使用的 0 到 100 范围内。
function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

// 用 locality、LGA 和区域组合成稳定键，避免同名地点相互覆盖。
function localityKey(item: Pick<LocalitySummaryItem, "locality" | "lgaName" | "regionalGroup">) {
  return `${item.locality}\u0000${item.lgaName}\u0000${item.regionalGroup}`;
}

// 汇总一个城镇中指定子类别的 POI 数量，作为设施覆盖评分输入。
function subcategoryCount(item: LocalitySummaryItem, subcategories: string[]): number {
  const wanted = new Set(subcategories);
  let total = 0;
  for (const category of item.categories) {
    for (const sub of category.subcategories) {
      if (wanted.has(sub.subcategory)) total += sub.poiCount;
    }
  }
  return total;
}

// 将数据集中的名称转换为适合界面展示的标题格式。
function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("en-AU")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

// 按用户偏好、POI 覆盖和区域画像的加权结果对城镇排序，并附带可核验的证据。
export class CompareService {
  // 保存城镇摘要、POI 和区域画像仓储，排名时从这些数据源读取信息。
  constructor(
    private readonly localities = LocalitySummaryServiceFactory.create(),
    private readonly detailLoader?: { load(): Promise<{ pois: ComparePoi[] }> } | null,
    private readonly profiles: AreaProfileRepository | null = null
  ) {}

  // 读取候选城镇，计算各偏好维度分数，合并区域画像后按总分降序返回。
  async rank(query: CompareQuery): Promise<CompareResponse> {
    const selected = query.prefs
      .map((id) => RANKING_PREFERENCES.find((pref) => pref.id === id))
      .filter((pref): pref is (typeof RANKING_PREFERENCES)[number] => Boolean(pref));
    const weights = query.weights ?? selected.map(() => 1);
    const preferences = selected.map((pref, index) => ({
      id: pref.id,
      label: pref.label,
      weight: weights[index],
      evidenceMethod: pref.evidenceMethod,
      warning: pref.warning
    }));

    const catalog = await this.localities.listAll();
    const items = await this.withDedupedCounts(
      catalog.items,
      selected.flatMap((pref) => pref.subcategories),
      catalog.dataSource
    );
    const searchText = query.q.toLocaleLowerCase("en-AU");
    const pool = searchText
      ? items.filter((item) =>
          [item.locality, item.lgaName, item.regionalGroup].some((value) =>
            value.toLocaleLowerCase("en-AU").includes(searchText)
          )
        )
      : items;

    const categoryMaximums = selected.map((pref) =>
      Math.max(0, ...pool.map((item) => subcategoryCount(item, pref.subcategories)))
    );
    const scored = pool
      .map((item) => this.scoreLocality(item, selected, weights, categoryMaximums))
      .filter((item) => item.rawScore > 0);

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const maximumPoiCount = Math.max(0, ...scored.map((row) => row.totalPoiCount));
    const evidence = this.profiles && scored.length > 0
      ? await this.profiles.findForAreas(scored)
      : new Map<string, AreaProfileEvidence>();
    const evidenceByRow = scored.map((row) => evidence.get(areaProfileKey(row.locality, row.lgaName)) ?? {
      sal: null,
      lga: null
    });
    const profileScores = scoreAreaProfiles(evidenceByRow);

    const composite = scored.map((row, rowIndex) => {
      const areaEvidence = evidenceByRow[rowIndex];
      const profile = profileScores[rowIndex];
      const userNeeds = totalWeight > 0 ? clampScore((row.rawScore / totalWeight) * 100) : 0;
      const poiCoverage = maximumPoiCount > 0
        ? clampScore((row.totalPoiCount / maximumPoiCount) * 100)
        : 0;
      const areaProfile = profile.score;
      const score =
        userNeeds * RANKING_WEIGHTS.userNeeds +
        poiCoverage * RANKING_WEIGHTS.poiCoverage +
        areaProfile * RANKING_WEIGHTS.areaProfile;

      return {
        ...row,
        score,
        scoreComponents: {
          userNeeds: { score: userNeeds, weight: RANKING_WEIGHTS.userNeeds },
          poiCoverage: { score: poiCoverage, weight: RANKING_WEIGHTS.poiCoverage },
          areaProfile: { score: areaProfile, weight: RANKING_WEIGHTS.areaProfile }
        },
        profileEvidence: {
          sal: publicProfile(areaEvidence.sal),
          lga: publicProfile(areaEvidence.lga),
          dimensions: profile.dimensions,
          fieldUsage: profile.fieldUsage,
          affectsRanking: true as const
        }
      };
    }).sort(
      (a, b) =>
        b.score - a.score ||
        b.totalPoiCount - a.totalPoiCount ||
        a.locality.localeCompare(b.locality, "en-AU")
    );

    const ranked: CompareRankItem[] = composite.slice(0, query.limit).map((row, index) => ({
      rank: index + 1,
      locality: row.locality,
      lgaName: row.lgaName,
      regionalGroup: row.regionalGroup,
      score: row.score,
      scoreComponents: row.scoreComponents,
      totalPoiCount: row.totalPoiCount,
      latitude: row.latitude,
      longitude: row.longitude,
      breakdown: row.breakdown,
      profileEvidence: row.profileEvidence
    }));

    const top = ranked[0] ?? null;
    const recommendation = top
      ? {
          locality: top.locality,
          lgaName: top.lgaName,
          score: top.score,
          summary: `${titleCase(top.locality)} in ${titleCase(top.lgaName)} fits your selected needs best among ${scored.length.toLocaleString("en-AU")} regional localities scored.`
        }
      : null;

    return {
      items: ranked,
      preferences,
      totalLocalitiesScored: scored.length,
      recommendation,
      dataSource: catalog.dataSource,
      generatedAt: new Date().toISOString()
    };
  }

  // 先按 OSM 标识和空间规则去重，再生成设施计数，避免重复 POI 扭曲排名。
  private async withDedupedCounts(
    items: LocalitySummaryItem[],
    preferredSubcategories: string[],
    dataSource: "csv" | "database"
  ): Promise<LocalitySummaryItem[]> {
    if (this.detailLoader === null) return items;
    if (dataSource !== "database" && process.env.NODE_ENV === "production") {
      throw new Error("CSV comparison is available only in offline tests.");
    }

    const loader = this.detailLoader ?? (dataSource === "database"
      ? new PostgresComparePoiLoader() : new CsvDatasetLoader());

    let dataset: { pois: ComparePoi[] };
    try {
      dataset = await loader.load();
    } catch (error) {
      console.error("Compare detail load failed; using summary counts.", error);
      return items;
    }

    const deduped = dedupeRegionalPois(dataset.pois);
    const byLocality = new Map<string, ComparePoi[]>();
    for (const poi of deduped) {
      const key = `${poi.locality}\u0000${poi.lgaName}\u0000${poi.regionalGroup}`;
      const bucket = byLocality.get(key);
      if (bucket) bucket.push(poi);
      else byLocality.set(key, [poi]);
    }

    return items.map((item) => {
      const pois = byLocality.get(localityKey(item));
      if (!pois?.length) return item;

      const subCounts = new Map<string, { subcategory: string; displayName: string; poiCount: number }>();
      for (const poi of pois) {
        const current = subCounts.get(poi.subcategory);
        if (current) current.poiCount += 1;
        else {
          subCounts.set(poi.subcategory, {
            subcategory: poi.subcategory,
            displayName: poi.displayName,
            poiCount: 1
          });
        }
      }

      const derived = [
        {
          subcategory: "primary_school",
          displayName: "Name-identified primary school",
          poiCount: pois.filter((poi) =>
            poi.subcategory === "school" && /\bprimary\b/i.test(poi.name)
          ).length,
          parent: "education"
        },
        {
          subcategory: "gym",
          displayName: "Name-identified gym or fitness centre",
          poiCount: pois.filter((poi) =>
            poi.subcategory === "sports_centre" && /\b(?:gym|fitness)\b/i.test(poi.name)
          ).length,
          parent: "recreation"
        }
      ].filter((entry) => entry.poiCount > 0);

      for (const entry of derived) {
        subCounts.set(entry.subcategory, entry);
      }

      const categories = item.categories
        .map((category) => {
          const subcategories = category.subcategories
            .map((sub) => {
              const next = subCounts.get(sub.subcategory);
              return next
                ? { ...sub, poiCount: next.poiCount }
                : { ...sub, poiCount: 0 };
            })
            .filter((sub) => sub.poiCount > 0);
          for (const entry of derived.filter((candidate) => candidate.parent === category.category)) {
            subcategories.push({
              subcategory: entry.subcategory,
              displayName: entry.displayName,
              poiCount: entry.poiCount
            });
          }
          const poiCount = subcategories
            .filter((sub) => !["primary_school", "gym"].includes(sub.subcategory))
            .reduce((sum, sub) => sum + sub.poiCount, 0);
          return { ...category, poiCount, subcategories };
        })
        .filter((category) => category.poiCount > 0)
        .sort((a, b) => b.poiCount - a.poiCount);

      const pin = mapPinForLocality(pois, item, preferredSubcategories);
      return {
        ...item,
        totalPoiCount: pois.length,
        categories,
        latitude: pin?.lat ?? item.latitude,
        longitude: pin?.lng ?? item.longitude
      };
    });
  }

  private scoreLocality(
    item: LocalitySummaryItem,
    selected: typeof RANKING_PREFERENCES,
    weights: number[],
    categoryMaximums: number[]
  ) {
    const breakdown = selected.map((pref, index) => {
      const count = subcategoryCount(item, pref.subcategories);
      const weight = weights[index] ?? 1;
      const maximum = categoryMaximums[index] ?? 0;
      return {
        preferenceId: pref.id,
        label: pref.label,
        count,
        weighted: maximum > 0 ? (count / maximum) * weight : 0
      };
    });
    const rawScore = breakdown.reduce((sum, row) => sum + row.weighted, 0);
    return {
      locality: item.locality,
      lgaName: item.lgaName,
      regionalGroup: item.regionalGroup,
      totalPoiCount: item.totalPoiCount,
      latitude: item.latitude,
      longitude: item.longitude,
      breakdown,
      rawScore
    };
  }
}

// 作用：实现 mapPinForLocality 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
function mapPinForLocality(
  pois: ComparePoi[],
  item: LocalitySummaryItem,
  preferredSubcategories: string[]
): { lat: number; lng: number } | null {
  if (!pois.length) return null;
  const centre =
    item.latitude != null && item.longitude != null
      ? { lat: item.latitude, lng: item.longitude }
      : {
          lat: pois.reduce((sum, poi) => sum + poi.latitude, 0) / pois.length,
          lng: pois.reduce((sum, poi) => sum + poi.longitude, 0) / pois.length
        };

  const preferred = [
    ...preferredSubcategories,
    "supermarket",
    "convenience_store",
    "school",
    "doctor",
    "clinic",
    "pharmacy",
    "park"
  ];
  for (const subcategory of preferred) {
    const matches = pois.filter((poi) => poi.subcategory === subcategory);
    if (!matches.length) continue;
    matches.sort(
      (a, b) =>
        haversineKm(centre, { lat: a.latitude, lng: a.longitude }) -
        haversineKm(centre, { lat: b.latitude, lng: b.longitude })
    );
    return { lat: matches[0].latitude, lng: matches[0].longitude };
  }

  return { lat: centre.lat, lng: centre.lng };
}
