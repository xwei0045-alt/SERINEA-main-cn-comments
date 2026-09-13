import { Environment } from "@/backend/config/Environment";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { PostgresLocalitySummaryRepository } from "@/backend/repositories/PostgresLocalitySummaryRepository";
import { CsvLocalitySummaryRepository } from "@/backend/repositories/CsvLocalitySummaryRepository";
import { LocalitySummaryService } from "@/backend/services/LocalitySummaryService";

// Town search aggregates the same production table used by reachability.
export class LocalitySummaryServiceFactory {
  private constructor() {}

  static create(): LocalitySummaryService {
    const environment = Environment.getInstance();
    if (environment.dataSource === "csv") {
      return new LocalitySummaryService(new CsvLocalitySummaryRepository());
    }
    return new LocalitySummaryService(
      new PostgresLocalitySummaryRepository(
        PostgresDatabase.getInstance(environment.databaseUrl as string)
      )
    );
  }
}
