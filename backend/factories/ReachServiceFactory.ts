import { Environment } from "@/backend/config/Environment";
import { PostgresReachRepository } from "@/backend/repositories/PostgresReachRepository";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { CsvReachRepository } from "@/backend/repositories/CsvReachRepository";
import { ReachService } from "@/backend/services/ReachService";

// The production RDS table is the only source used by the map API.
export class ReachServiceFactory {
  private constructor() {}

  static create(): ReachService {
    const environment = Environment.getInstance();

    if (environment.dataSource === "csv") {
      return new ReachService(new CsvReachRepository());
    }

    return new ReachService(
      new PostgresReachRepository(
        PostgresDatabase.getInstance(environment.databaseUrl as string)
      )
    );
  }
}
