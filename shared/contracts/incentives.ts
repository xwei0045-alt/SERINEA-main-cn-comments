import { z } from "zod";

export const relocationStageSchema = z.enum([
  "planning_to_move",
  "already_moved",
  "unknown"
]);

export const incentiveProfileSchema = z.object({
  age: z.number().int().min(0).max(120).nullable(),
  income: z.number().nonnegative().nullable(),
  income_scope: z.enum(["individual", "household", "unknown"]),
  income_period: z.enum(["annual", "monthly", "weekly", "unknown"]),
  income_basis: z.enum(["gross", "net", "unknown"]),
  has_child: z.boolean().nullable(),
  child_ages: z.array(z.number().int().min(0).max(25)),
  locality: z.string().trim().max(100).nullable(),
  lga_name: z.string().trim().max(100).nullable(),
  move_distance_km: z.number().nonnegative().nullable(),
  days_since_move: z.number().int().nonnegative().nullable(),
  new_resident: z.boolean().nullable()
});

export const incentiveRequestSchema = z.object({
  message: z.string().trim().max(2000),
  relocationStage: relocationStageSchema,
  profile: incentiveProfileSchema,
  towns: z.array(z.object({
    locality: z.string().trim().min(1).max(100),
    lgaName: z.string().trim().min(1).max(100)
  })).max(5).default([]),
  limitPerTown: z.number().int().min(1).max(5).default(3)
});

export type IncentiveRequest = z.infer<typeof incentiveRequestSchema>;
export type IncentiveStatus =
  | "Potential Incentive"
  | "Possible Match"
  | "More Information Needed";

export type IncentiveResultItem = {
  subsidyId: string;
  subsidyName: string;
  category: string;
  benefitType: string;
  maxAmountAud: number;
  status: IncentiveStatus;
  mockStatus: "mock_open" | "mock_upcoming";
  matched: string[];
  missing: string[];
  eligibilitySummary: string;
  requiredEvidence: string;
};

export type IncentiveTownGroup = {
  locality: string;
  lgaName: string;
  source: "lifestyle_ranking" | "named_area_query";
  items: IncentiveResultItem[];
};

export type IncentiveResponse = {
  groups: IncentiveTownGroup[];
  queryArea: string | null;
  needsAreaOrLifestyle: boolean;
  dataSource: "SERINEA_mock_subsidies_450.csv";
  isSynthetic: true;
  recordNotice: string;
  generatedAt: string;
};

