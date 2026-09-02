import { Environment } from "@/backend/config/Environment";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { CsvLocalitySummaryRepository } from "@/backend/repositories/CsvLocalitySummaryRepository";
import { PostgresLocalitySummaryRepository } from "@/backend/repositories/PostgresLocalitySummaryRepository";
import { LocalitySummaryService } from "@/backend/services/LocalitySummaryService";

/** Selects the locality source using the same setting as the reachability API. */
export class LocalitySummaryServiceFactory {
  private constructor() {}

  static create(): LocalitySummaryService {
    const environment = Environment.getInstance();
    if (environment.dataSource !== "database") {
      return new LocalitySummaryService(new CsvLocalitySummaryRepository());
    }

    return new LocalitySummaryService(
      new PostgresLocalitySummaryRepository(
        PostgresDatabase.getInstance(environment.databaseUrl as string)
      )
    );
  }
}
