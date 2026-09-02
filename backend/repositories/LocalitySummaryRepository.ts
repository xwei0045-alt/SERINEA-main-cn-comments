import type {
  LocalityCentroid,
  LocalityPoiSummaryRecord
} from "@/backend/data/RegionalDataset";

export type LocalitySummaryData = {
  rows: LocalityPoiSummaryRecord[];
  totalPois: number;
  centroids: LocalityCentroid[];
};

/** Data-source contract for locality summary rows. */
export interface LocalitySummaryRepository {
  readonly dataSource: "csv" | "database";

  load(): Promise<LocalitySummaryData>;
}
