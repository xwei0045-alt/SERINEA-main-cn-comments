import { COMPARE_PREFERENCES } from "@/lib/types";
import { LocalitySummaryService } from "@/backend/services/LocalitySummaryService";
import type {
  CompareQuery,
  CompareRankItem,
  CompareResponse
} from "@/shared/contracts/compare";
import type { LocalitySummaryItem } from "@/shared/contracts/localities";

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

function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("en-AU")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

/** Ranks regional localities by weighted preference coverage from the summary CSV. */
export class CompareService {
  constructor(private readonly localities = new LocalitySummaryService()) {}

  async rank(query: CompareQuery): Promise<CompareResponse> {
    const selected = COMPARE_PREFERENCES.filter((pref) => query.prefs.includes(pref.id));
    const weight = 1;
    const preferences = selected.map((pref) => ({
      id: pref.id,
      label: pref.label,
      weight
    }));

    const catalog = await this.localities.listAll();
    const searchText = query.q.toLocaleLowerCase("en-AU");
    const pool = searchText
      ? catalog.items.filter((item) =>
          [item.locality, item.lgaName, item.regionalGroup].some((value) =>
            value.toLocaleLowerCase("en-AU").includes(searchText)
          )
        )
      : catalog.items;

    const scored = pool
      .map((item) => this.scoreLocality(item, selected, weight))
      .filter((item) => item.rawScore > 0)
      .sort(
        (a, b) =>
          b.rawScore - a.rawScore ||
          b.totalPoiCount - a.totalPoiCount ||
          a.locality.localeCompare(b.locality, "en-AU")
      );

    const maxRaw = scored[0]?.rawScore ?? 0;
    const items: CompareRankItem[] = scored.slice(0, query.limit).map((row, index) => ({
      rank: index + 1,
      locality: row.locality,
      lgaName: row.lgaName,
      regionalGroup: row.regionalGroup,
      score: maxRaw > 0 ? Math.round((row.rawScore / maxRaw) * 100) : 0,
      totalPoiCount: row.totalPoiCount,
      latitude: row.latitude,
      longitude: row.longitude,
      breakdown: row.breakdown
    }));

    const top = items[0] ?? null;
    const recommendation = top
      ? {
          locality: top.locality,
          lgaName: top.lgaName,
          score: top.score,
          summary: `${titleCase(top.locality)} in ${titleCase(top.lgaName)} fits your selected needs best among ${scored.length.toLocaleString("en-AU")} regional localities scored.`
        }
      : null;

    return {
      items,
      preferences,
      totalLocalitiesScored: scored.length,
      recommendation,
      dataSource: catalog.dataSource,
      generatedAt: new Date().toISOString()
    };
  }

  private scoreLocality(
    item: LocalitySummaryItem,
    selected: typeof COMPARE_PREFERENCES,
    weight: number
  ) {
    const breakdown = selected.map((pref) => {
      const count = subcategoryCount(item, pref.subcategories);
      return {
        preferenceId: pref.id,
        label: pref.label,
        count,
        weighted: count * weight
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
