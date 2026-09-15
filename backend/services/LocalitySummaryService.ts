import type {
  LocalitySummaryData,
  LocalitySummaryRepository
} from "@/backend/repositories/LocalitySummaryRepository";
import type {
  LocalitySummaryItem,
  LocalitySummaryQuery,
  LocalitySummaryResponse
} from "@/shared/contracts/localities";
import { rankLocalityMatches } from "@/lib/localitySearch";

/** Handles the locality key step. */
function localityKey(locality: string, lgaName: string, regionalGroup: string) {
  return `${locality}\u0000${lgaName}\u0000${regionalGroup}`;
}

type MutableLocality = {
  key: string;
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

// Town search. We group the summary CSV so Shepparton is one row, not 40 category rows.
export class LocalitySummaryService {
  private dataPromise: ReturnType<LocalitySummaryRepository["load"]> | undefined;
  private summariesPromise: Promise<LocalitySummaryItem[]> | undefined;

  /** Sets up this component with the dependencies it needs. */
  constructor(private readonly repository: LocalitySummaryRepository) {}

  /** Searches the data using the validated request. */
  async search(query: LocalitySummaryQuery): Promise<LocalitySummaryResponse> {
    const data = await this.getData();
    const summaries = await this.getSummaries(data);
    const searchText = query.q.toLocaleLowerCase("en-AU");
    const filtered = searchText
      ? summaries.filter((item) =>
          [item.locality, item.lgaName, item.regionalGroup].some((value) =>
            value.toLocaleLowerCase("en-AU").includes(searchText)
          )
        )
      : summaries;
    // Exact / prefix town names rise first so every regional name can be found quickly.
    const matches = searchText ? rankLocalityMatches(filtered, searchText) : filtered;

    return {
      items: matches.slice(0, query.limit),
      totalMatches: matches.length,
      totalLocalities: summaries.length,
      totalPois: data.totalPois,
      dataSource: this.repository.dataSource,
      generatedAt: new Date().toISOString()
    };
  }

  /** Full aggregated locality list for ranking (not capped like the search API). */
  async listAll(): Promise<{
    items: LocalitySummaryItem[];
    totalPois: number;
    dataSource: LocalitySummaryResponse["dataSource"];
  }> {
    const data = await this.getData();
    const items = await this.getSummaries(data);
    return {
      items,
      totalPois: data.totalPois,
      dataSource: this.repository.dataSource
    };
  }

  /** Returns the data. */
  private getData(): ReturnType<LocalitySummaryRepository["load"]> {
    if (!this.dataPromise) this.dataPromise = this.repository.load();
    return this.dataPromise;
  }

  /** Returns the summaries. */
  private getSummaries(data: LocalitySummaryData): Promise<LocalitySummaryItem[]> {
    if (!this.summariesPromise) {
      this.summariesPromise = Promise.resolve(this.aggregate(data));
    }
    return this.summariesPromise;
  }

  /** Handles the aggregate step. */
  private aggregate(data: LocalitySummaryData): LocalitySummaryItem[] {
    const localities = new Map<string, MutableLocality>();
    const centroidByKey = new Map(
      data.centroids.map((centroid) => [
        localityKey(centroid.locality, centroid.lgaName, centroid.regionalGroup),
        centroid
      ])
    );

    for (const row of data.rows) {
      const key = localityKey(row.locality, row.lgaName, row.regionalGroup);
      let locality = localities.get(key);

      if (!locality) {
        locality = {
          key,
          locality: row.locality,
          lgaName: row.lgaName,
          regionalGroup: row.regionalGroup,
          totalPoiCount: 0,
          categories: new Map()
        };
        localities.set(key, locality);
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
      .map((locality) => {
        const centroid = centroidByKey.get(locality.key);
        return {
          locality: locality.locality,
          lgaName: locality.lgaName,
          regionalGroup: locality.regionalGroup,
          totalPoiCount: locality.totalPoiCount,
          latitude: centroid?.latitude,
          longitude: centroid?.longitude,
          categories: [...locality.categories.values()]
            .map((category) => ({
              ...category,
              subcategories: category.subcategories.sort(
                (first, second) => second.poiCount - first.poiCount
              )
            }))
            .sort((first, second) => second.poiCount - first.poiCount)
        };
      })
      .sort(
        (first, second) =>
          second.totalPoiCount - first.totalPoiCount ||
          first.locality.localeCompare(second.locality, "en-AU")
      );
  }
}
