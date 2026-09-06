import { z } from "zod";
import type { ReachResponse } from "@/shared/contracts/reach";

// The deployed RDS database is the single runtime source of POI data.
const environmentSchema = z
  .object({
    REACH_DATA_SOURCE: z.literal("database").default("database"),
    DATABASE_URL: z.string().trim().min(1).optional()
  })
  .superRefine((values, context) => {
    if (!values.DATABASE_URL) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when REACH_DATA_SOURCE=database."
      });
    }
  });

type EnvironmentValues = z.infer<typeof environmentSchema>;

// Reads env once. Other classes ask this instead of poking process.env.
export class Environment {
  private static instance: Environment | undefined;

  private constructor(private readonly values: EnvironmentValues) {}

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
