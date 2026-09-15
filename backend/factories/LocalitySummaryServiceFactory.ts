import { Environment } from "@/backend/config/Environment";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { PostgresLocalitySummaryRepository } from "@/backend/repositories/PostgresLocalitySummaryRepository";
import { LocalitySummaryService } from "@/backend/services/LocalitySummaryService";

// Town search aggregates the same production table used by reachability.
export class LocalitySummaryServiceFactory {
  /** Sets up this component with the dependencies it needs. */
  private constructor() {}

  /** Builds the service with its production dependencies. */
  static create(): LocalitySummaryService {
    const environment = Environment.getInstance();
    return new LocalitySummaryService(
      new PostgresLocalitySummaryRepository(
        PostgresDatabase.getInstance(environment.databaseUrl as string)
      )
    );
  }
}
