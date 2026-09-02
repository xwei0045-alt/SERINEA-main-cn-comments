import { CsvDatasetLoader } from "@/backend/data/CsvDatasetLoader";
import type {
  LocalitySummaryData,
  LocalitySummaryRepository
} from "./LocalitySummaryRepository";

/** Reads locality summaries from the supplied CSV file. */
export class CsvLocalitySummaryRepository implements LocalitySummaryRepository {
  readonly dataSource = "csv" as const;

  constructor(private readonly loader = new CsvDatasetLoader()) {}

  async load(): Promise<LocalitySummaryData> {
    const dataset = await this.loader.load();
    return {
      rows: dataset.localitySummaries,
      totalPois: dataset.metadata.summaryPoiCount
    };
  }
}
