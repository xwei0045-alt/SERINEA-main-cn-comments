import { RANKING_PREFERENCES } from "@/lib/types";
import { LocalitySummaryServiceFactory } from "@/backend/factories/LocalitySummaryServiceFactory";
import { PostgresComparePoiLoader, type ComparePoi } from "@/backend/repositories/PostgresComparePoiLoader";
import { CsvDatasetLoader } from "@/backend/data/CsvDatasetLoader";
import { dedupeRegionalPois } from "@/backend/data/poiDedupe";
import { haversineKm } from "@/lib/geo";
import type {
  CompareQuery,
  CompareRankItem,
  CompareResponse
} from "@/shared/contracts/compare";
import type { LocalitySummaryItem } from "@/shared/contracts/localities";

/** Handles the locality key step. */
function localityKey(item: Pick<LocalitySummaryItem, "locality" | "lgaName" | "regionalGroup">) {
  return `${item.locality}\u0000${item.lgaName}\u0000${item.regionalGroup}`;
}

/** Handles the subcategory count step. */
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

/** Handles the title case step. */
function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("en-AU")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

/** Ranks regional localities by weighted preference coverage from the regional extract. */
export class CompareService {
  /** Sets up this component with the dependencies it needs. */
  constructor(
    private readonly localities = LocalitySummaryServiceFactory.create(),
    /** Pass null in unit tests to keep counts on the injected locality summary. */
    private readonly detailLoader?: { load(): Promise<{ pois: ComparePoi[] }> } | null
  ) {}

  /** Ranks towns using the selected preference weights. */
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
      .filter((item) => item.rawScore > 0)
      .sort(
        (a, b) =>
          b.rawScore - a.rawScore ||
          b.totalPoiCount - a.totalPoiCount ||
          a.locality.localeCompare(b.locality, "en-AU")
      );

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const ranked: CompareRankItem[] = scored.slice(0, query.limit).map((row, index) => ({
      rank: index + 1,
      locality: row.locality,
      lgaName: row.lgaName,
      regionalGroup: row.regionalGroup,
      // Missing categories retain their weight; the winner is not rescaled to 100.
      // Keep precision here; round only when displaying the score.
      score: totalWeight > 0 ? Math.min(100, (row.rawScore / totalWeight) * 100) : 0,
      totalPoiCount: row.totalPoiCount,
      latitude: row.latitude,
      longitude: row.longitude,
      breakdown: row.breakdown
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

  /**
   * Rebuild subcategory counts from deduped detail rows so OSM node/way clones
   * do not inflate park or grocery totals. Also move the map pin onto a place
   * that matches the user's top preference when possible.
   */
  private async withDedupedCounts(
    items: LocalitySummaryItem[],
    preferredSubcategories: string[],
    dataSource: "csv" | "database"
  ): Promise<LocalitySummaryItem[]> {
    if (this.detailLoader === null) return items;

    const loader = this.detailLoader ?? (dataSource === "database"
      ? new PostgresComparePoiLoader() : new CsvDatasetLoader());

    let dataset: { pois: ComparePoi[] };
    try {
      dataset = await loader.load();
    } catch (error) {
      // Keep ranking available from locality summaries if detail POIs fail.
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

      // Keep the original category buckets but replace counts with deduped totals.
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
          // Derived rows describe existing POIs, so do not add them to category totals.
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

  /** Handles the score locality step. */
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

/** Prefer a real facility pin so "View on map" lands inside walk range of that place. */
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
