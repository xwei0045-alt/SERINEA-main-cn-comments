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

// 用城镇、LGA 和区域组成聚合键，确保同一城镇的多条设施记录合并。
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

// 城镇搜索服务把同一城镇的多条设施记录聚合成一个摘要对象。
export class LocalitySummaryService {
  private dataPromise: ReturnType<LocalitySummaryRepository["load"]> | undefined;
  private summariesPromise: Promise<LocalitySummaryItem[]> | undefined;

  // 保存摘要仓储，并在首次请求时延迟加载数据。
  constructor(private readonly repository: LocalitySummaryRepository) {}

  // 从缓存的聚合摘要中按城镇、LGA 或区域名称搜索，并按匹配度截取结果。
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
    // 让精确名称和前缀匹配优先，方便用户快速找到区域名称。
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

  // 返回完整聚合列表供排名使用，不受搜索接口的数量限制。
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

  // 延迟加载并缓存原始摘要数据，避免每次请求重复访问数据库。
  private getData(): ReturnType<LocalitySummaryRepository["load"]> {
    if (!this.dataPromise) this.dataPromise = this.repository.load();
    return this.dataPromise;
  }

  // 延迟生成并缓存聚合后的城镇摘要列表。
  private getSummaries(data: LocalitySummaryData): Promise<LocalitySummaryItem[]> {
    if (!this.summariesPromise) {
      this.summariesPromise = Promise.resolve(this.aggregate(data));
    }
    return this.summariesPromise;
  }

  // 按城镇和类别合并 POI 计数，并附加中心点后按总数量排序。
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
