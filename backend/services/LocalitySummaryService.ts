import { CsvLocalitySummaryRepository } from "@/backend/repositories/CsvLocalitySummaryRepository";
import type {
  LocalitySummaryData,
  LocalitySummaryRepository
} from "@/backend/repositories/LocalitySummaryRepository";
import type {
  LocalitySummaryItem,
  LocalitySummaryQuery,
  LocalitySummaryResponse
} from "@/shared/contracts/localities";

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

  constructor(
    private readonly repository: LocalitySummaryRepository =
      new CsvLocalitySummaryRepository()
  ) {}

  async search(query: LocalitySummaryQuery): Promise<LocalitySummaryResponse> {
    const data = await this.getData();
    const summaries = await this.getSummaries(data);
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
      totalPois: data.totalPois,
      dataSource: this.repository.dataSource,
      generatedAt: new Date().toISOString()
    };
  }

  private getData(): ReturnType<LocalitySummaryRepository["load"]> {
    if (!this.dataPromise) this.dataPromise = this.repository.load();
    return this.dataPromise;
  }

  private getSummaries(data: LocalitySummaryData): Promise<LocalitySummaryItem[]> {
    if (!this.summariesPromise) {
      this.summariesPromise = Promise.resolve(this.aggregate(data));
    }
    return this.summariesPromise;
  }

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
