import { CsvDatasetLoader } from "./CsvDatasetLoader";
import type {
  LocalitySummaryData,
  LocalitySummaryRepository
} from "@/backend/repositories/LocalitySummaryRepository";

export class CsvLocalitySummaryRepository implements LocalitySummaryRepository {
  readonly dataSource = "csv" as const;

  // 作用：实现 constructor 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  constructor(private readonly loader = new CsvDatasetLoader()) {}

  // 作用：实现 load 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  async load(): Promise<LocalitySummaryData> {
    const dataset = await this.loader.load();
    return {
      rows: dataset.localitySummaries,
      totalPois: dataset.metadata.summaryPoiCount,
      centroids: dataset.localityCentroids
    };
  }
}
