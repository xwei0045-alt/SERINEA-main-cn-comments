import { z } from "zod";
import type { ReachResponse } from "@/shared/contracts/reach";

/**
 * Environment variables accepted by the backend.
 * CSV data is the default because the supplied Iteration 1 files are now available.
 */
const environmentSchema = z
  .object({
    REACH_DATA_SOURCE: z.enum(["demo", "csv", "database"]).default("csv"),
    DATABASE_URL: z.string().trim().min(1).optional()
  })
  .superRefine((values, context) => {
    if (values.REACH_DATA_SOURCE === "database" && !values.DATABASE_URL) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when REACH_DATA_SOURCE=database."
      });
    }
  });

type EnvironmentValues = z.infer<typeof environmentSchema>;

/**
 * Singleton that reads and validates backend configuration in one place.
 * Other classes ask this object for settings instead of reading process.env everywhere.
 */
export class Environment {
  private static instance: Environment | undefined;

  private constructor(private readonly values: EnvironmentValues) {}

  /** Validates the configuration once, then reuses the same read-only instance. */
  static getInstance(): Environment {
    if (!Environment.instance) {
      Environment.instance = new Environment(environmentSchema.parse(process.env));
    }
    return Environment.instance;
  }

  get dataSource(): ReachResponse["dataSource"] {
    return this.values.REACH_DATA_SOURCE;
  }

  get databaseUrl(): string | undefined {
    return this.values.DATABASE_URL;
  }
}
