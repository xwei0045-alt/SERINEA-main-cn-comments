import { CsvDatasetLoader } from "@/backend/data/CsvDatasetLoader";
import type { LocalityPoiSummaryRecord } from "@/backend/data/RegionalDataset";
import type {
  LocalitySummaryItem,
  LocalitySummaryQuery,
  LocalitySummaryResponse
} from "@/shared/contracts/localities";

type MutableLocality = {
  locality: string;
  lgaName: string;
  regionalGroup: string;
  totalPoiCount: number;
  categories: Map<
    string,
    {
      category: string;
      poiCount: number;
      subcategories: Array<{
        subcategory: string;
        displayName: string;
        poiCount: number;
      }>;
    }
  >;
};

/** Builds searchable locality statistics from the second supplied CSV file. */
export class LocalitySummaryService {
  private summariesPromise: Promise<LocalitySummaryItem[]> | undefined;

  constructor(private readonly loader = new CsvDatasetLoader()) {}

  async search(query: LocalitySummaryQuery): Promise<LocalitySummaryResponse> {
    const [dataset, summaries] = await Promise.all([
      this.loader.load(),
      this.getSummaries()
    ]);
    const searchText = query.q.toLocaleLowerCase("en-AU");
    const matches = searchText
      ? summaries.filter((item) =>
          [item.locality, item.lgaName, item.regionalGroup].some((value) =>
            value.toLocaleLowerCase("en-AU").includes(searchText)
          )
        )
      : summaries;

    return {
      items: matches.slice(0, query.limit),
      totalMatches: matches.length,
      totalLocalities: summaries.length,
      totalPois: dataset.metadata.summaryPoiCount,
      dataSource: "csv",
      generatedAt: new Date().toISOString()
    };
  }

  private getSummaries(): Promise<LocalitySummaryItem[]> {
    if (!this.summariesPromise) {
      this.summariesPromise = this.loader
        .load()
        .then((dataset) => this.aggregate(dataset.localitySummaries));
    }
    return this.summariesPromise;
  }

  private aggregate(rows: LocalityPoiSummaryRecord[]): LocalitySummaryItem[] {
    const localities = new Map<string, MutableLocality>();

    for (const row of rows) {
      const localityKey = `${row.locality}\u0000${row.lgaName}\u0000${row.regionalGroup}`;
      let locality = localities.get(localityKey);

      if (!locality) {
        locality = {
          locality: row.locality,
          lgaName: row.lgaName,
          regionalGroup: row.regionalGroup,
          totalPoiCount: 0,
          categories: new Map()
        };
        localities.set(localityKey, locality);
      }

      locality.totalPoiCount += row.poiCount;
      let category = locality.categories.get(row.category);
      if (!category) {
        category = { category: row.category, poiCount: 0, subcategories: [] };
        locality.categories.set(row.category, category);
      }
      category.poiCount += row.poiCount;
      category.subcategories.push({
        subcategory: row.subcategory,
        displayName: row.displayName,
        poiCount: row.poiCount
      });
    }

    return [...localities.values()]
      .map((locality) => ({
        locality: locality.locality,
        lgaName: locality.lgaName,
        regionalGroup: locality.regionalGroup,
        totalPoiCount: locality.totalPoiCount,
        categories: [...locality.categories.values()]
          .map((category) => ({
            ...category,
            subcategories: category.subcategories.sort(
              (first, second) => second.poiCount - first.poiCount
            )
          }))
          .sort((first, second) => second.poiCount - first.poiCount)
      }))
      .sort(
        (first, second) =>
          second.totalPoiCount - first.totalPoiCount ||
          first.locality.localeCompare(second.locality, "en-AU")
      );
  }
}
