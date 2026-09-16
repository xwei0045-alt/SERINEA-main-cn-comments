import { z } from "zod";
import { RANKING_PREFERENCES } from "@/lib/types";

const preferenceIds = RANKING_PREFERENCES.map((item) => item.id) as [
  string,
  ...string[]
];

export const compareQuerySchema = z.object({
  /** Comma-separated preference ids, in the user's chosen order. */
  prefs: z
    .string()
    .trim()
    .min(1, "Choose at least one preference.")
    .transform((value, context) => {
      const values = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const invalid = values.filter((item) => !preferenceIds.includes(item));
      if (invalid.length > 0) {
        context.addIssue({
          code: "custom",
          message: `Unknown preferences: ${invalid.join(", ")}`
        });
        return [];
      }
      return [...new Set(values)];
    }),
  /** Optional comma-separated ranking weights aligned to prefs. */
  weights: z
    .string()
    .trim()
    .transform((value, context) => {
      const weights = value.split(",").map((item) => Number(item.trim()));
      const invalid = weights.some((item) => !Number.isFinite(item) || item <= 0);
      if (invalid) {
        context.addIssue({
          code: "custom",
          message: "Weights must be positive numbers."
        });
        return undefined;
      }
      return weights;
    })
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  /** Optional town name filter before ranking. */
  q: z.string().trim().max(100).optional().default("")
}).superRefine((value, context) => {
  if (value.weights && value.weights.length !== value.prefs.length) {
    context.addIssue({
      code: "custom",
      path: ["weights"],
      message: "Weights must match the selected preferences."
    });
  }
});

export type CompareQuery = z.infer<typeof compareQuerySchema>;

export const compareBreakdownSchema = z.object({
  preferenceId: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
  weighted: z.number().nonnegative()
});

const areaProfileSchema = z.object({
  code: z.string(),
  name: z.string(),
  population: z.number().nonnegative().nullable(),
  medianAgeYears: z.number().nonnegative().nullable(),
  medianPersonalIncomeWeeklyAud: z.number().nonnegative().nullable(),
  medianHouseholdIncomeWeeklyAud: z.number().nonnegative().nullable(),
  unemploymentRatePct: z.number().min(0).max(100).nullable(),
  labourForceParticipationPct: z.number().min(0).max(100).nullable(),
  irsadScore: z.number().nullable(),
  irsadDecile: z.number().int().min(1).max(10).nullable(),
  ierScore: z.number().nullable(),
  ierDecile: z.number().int().min(1).max(10).nullable(),
  censusYear: z.number().int().nullable(),
  seifaYear: z.number().int().nullable(),
  seifaStatus: z.string().nullable()
});

const profileEvidenceSchema = z.object({
  sal: areaProfileSchema.nullable(),
  lga: areaProfileSchema.extend({
    incomeYear: z.number().int().nullable(),
    jobsYear: z.number().int().nullable()
  }).nullable(),
  /** Profile facts explain an area but do not change facility ranking by default. */
  affectsRanking: z.literal(false)
});

export const compareRankItemSchema = z.object({
  rank: z.number().int().positive(),
  locality: z.string(),
  lgaName: z.string(),
  regionalGroup: z.string(),
  score: z.number().min(0).max(100),
  totalPoiCount: z.number().int().nonnegative(),
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional(),
  breakdown: z.array(compareBreakdownSchema),
  profileEvidence: profileEvidenceSchema.optional()
});

export const compareResponseSchema = z.object({
  items: z.array(compareRankItemSchema),
  preferences: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      weight: z.number().positive(),
      evidenceMethod: z.enum(["exact_subcategory", "category_total", "name_heuristic"]),
      warning: z.string().optional()
    })
  ),
  totalLocalitiesScored: z.number().int().nonnegative(),
  recommendation: z
    .object({
      locality: z.string(),
      lgaName: z.string(),
      score: z.number(),
      summary: z.string()
    })
    .nullable(),
  dataSource: z.enum(["csv", "database"]),
  generatedAt: z.string().datetime()
});

export type CompareResponse = z.infer<typeof compareResponseSchema>;
export type CompareRankItem = z.infer<typeof compareRankItemSchema>;
