import { Environment } from "@/backend/config/Environment";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { PostgresLocalitySummaryRepository } from "@/backend/repositories/PostgresLocalitySummaryRepository";
import { LocalitySummaryService } from "@/backend/services/LocalitySummaryService";

// Town search aggregates the same production table used by reachability.
export class LocalitySummaryServiceFactory {
  private constructor() {}

  static create(): LocalitySummaryService {
    const environment = Environment.getInstance();
    return new LocalitySummaryService(
      new PostgresLocalitySummaryRepository(
        PostgresDatabase.getInstance(environment.databaseUrl as string)
      )
    );
  }
}
