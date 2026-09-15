import { CsvDatasetLoader } from "./CsvDatasetLoader";
import type {
  LocalitySummaryData,
  LocalitySummaryRepository
} from "@/backend/repositories/LocalitySummaryRepository";

/** Reads the archived CSV locality snapshot for offline backend tests only. */
export class CsvLocalitySummaryRepository implements LocalitySummaryRepository {
  readonly dataSource = "csv" as const;

  /** Uses the archived regional CSV fixture reader. */
  constructor(private readonly loader = new CsvDatasetLoader()) {}

  /** Loads locality rows and totals from the test snapshot. */
  async load(): Promise<LocalitySummaryData> {
    const dataset = await this.loader.load();
    return {
      rows: dataset.localitySummaries,
      totalPois: dataset.metadata.summaryPoiCount,
      centroids: dataset.localityCentroids
    };
  }
}
