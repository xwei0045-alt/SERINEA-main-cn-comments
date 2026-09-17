import type {
  LocalityCentroid,
  LocalityPoiSummaryRecord
} from "@/backend/data/RegionalDataset";

export type LocalitySummaryData = {
  rows: LocalityPoiSummaryRecord[];
  totalPois: number;
  centroids: LocalityCentroid[];
};

export interface LocalitySummaryRepository {
  readonly dataSource: "csv" | "database";

  // 作用：实现 load 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  load(): Promise<LocalitySummaryData>;
}
