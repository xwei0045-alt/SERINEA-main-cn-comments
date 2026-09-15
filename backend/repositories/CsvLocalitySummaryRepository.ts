import { CsvDatasetLoader } from "@/backend/data/CsvDatasetLoader";
import type {
  LocalitySummaryData,
  LocalitySummaryRepository
} from "./LocalitySummaryRepository";

/** Reads locality summaries from the supplied CSV file. */
export class CsvLocalitySummaryRepository implements LocalitySummaryRepository {
  readonly dataSource = "csv" as const;

  /** Sets up this component with the dependencies it needs. */
  constructor(private readonly loader = new CsvDatasetLoader()) {}

  /** Loads the records required by this repository. */
  async load(): Promise<LocalitySummaryData> {
    const dataset = await this.loader.load();
    return {
      rows: dataset.localitySummaries,
      totalPois: dataset.metadata.summaryPoiCount,
      centroids: dataset.localityCentroids
    };
  }
}
