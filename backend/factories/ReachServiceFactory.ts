import { Environment } from "@/backend/config/Environment";
import { CsvReachRepository } from "@/backend/repositories/CsvReachRepository";
import { DemoReachRepository } from "@/backend/repositories/DemoReachRepository";
import { ReachService } from "@/backend/services/ReachService";

/**
 * Builds ReachService with the data source selected by the environment.
 * This is the only place that needs changing when the PostGIS repository is ready.
 */
export class ReachServiceFactory {
  private constructor() {}

  static create(): ReachService {
    const environment = Environment.getInstance();

    if (environment.dataSource === "demo") {
      return new ReachService(new DemoReachRepository());
    }

    if (environment.dataSource === "csv") {
      return new ReachService(new CsvReachRepository());
    }

    throw new Error(
      "The database repository will be enabled after the real data schema is confirmed."
    );
  }
}
