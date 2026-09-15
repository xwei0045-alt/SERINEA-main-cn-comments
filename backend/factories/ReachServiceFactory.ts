import { Environment } from "@/backend/config/Environment";
import { PostgresReachRepository } from "@/backend/repositories/PostgresReachRepository";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { ReachService } from "@/backend/services/ReachService";

// The production RDS table is the only source used by the map API.
export class ReachServiceFactory {
  /** Sets up this component with the dependencies it needs. */
  private constructor() {}

  /** Builds the service with its production dependencies. */
  static create(): ReachService {
    const environment = Environment.getInstance();

    return new ReachService(
      new PostgresReachRepository(
        PostgresDatabase.getInstance(environment.databaseUrl as string)
      )
    );
  }
}
