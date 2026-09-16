import { Environment } from "@/backend/config/Environment";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { PostgresAreaProfileRepository } from "@/backend/repositories/PostgresAreaProfileRepository";
import { PostgresComparePoiLoader } from "@/backend/repositories/PostgresComparePoiLoader";
import { LocalitySummaryServiceFactory } from "./LocalitySummaryServiceFactory";
import { CompareService } from "@/backend/services/CompareService";

/** Wires Compare to the shared RDS connection and backend-only profile data. */
export class CompareServiceFactory {
  /** Prevents construction because this class only exposes a factory method. */
  private constructor() {}

  /** Builds the production service with POI, SAL, and LGA repositories. */
  static create(): CompareService {
    const environment = Environment.getInstance();
    const database = PostgresDatabase.getInstance(environment.databaseUrl as string);
    return new CompareService(
      LocalitySummaryServiceFactory.create(),
      new PostgresComparePoiLoader(database),
      new PostgresAreaProfileRepository(database)
    );
  }
}
