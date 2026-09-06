import { Environment } from "@/backend/config/Environment";
import { PostgresReachRepository } from "@/backend/repositories/PostgresReachRepository";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { ReachService } from "@/backend/services/ReachService";

// The production RDS table is the only source used by the map API.
export class ReachServiceFactory {
  private constructor() {}

  static create(): ReachService {
    const environment = Environment.getInstance();

    return new ReachService(
      new PostgresReachRepository(
        PostgresDatabase.getInstance(environment.databaseUrl as string)
      )
    );
  }
}
