import type { LocalityPoiSummaryRecord } from "@/backend/data/RegionalDataset";

export type LocalitySummaryData = {
  rows: LocalityPoiSummaryRecord[];
  totalPois: number;
};

/** Data-source contract for locality summary rows. */
export interface LocalitySummaryRepository {
  readonly dataSource: "csv" | "database";

  load(): Promise<LocalitySummaryData>;
}
