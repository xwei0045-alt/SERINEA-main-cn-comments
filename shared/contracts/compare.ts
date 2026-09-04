import { z } from "zod";
import { COMPARE_PREFERENCES } from "@/lib/types";

const preferenceIds = COMPARE_PREFERENCES.map((item) => item.id) as [
  string,
  ...string[]
];

export const compareQuerySchema = z.object({
  /** Comma-separated preference ids. Selected prefs get equal weight unless weights are passed. */
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
  limit: z.coerce.number().int().min(1).max(50).default(12),
  /** Optional town name filter before ranking. */
  q: z.string().trim().max(100).optional().default("")
});

export type CompareQuery = z.infer<typeof compareQuerySchema>;

export const compareBreakdownSchema = z.object({
  preferenceId: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
  weighted: z.number().nonnegative()
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
  breakdown: z.array(compareBreakdownSchema)
});

export const compareResponseSchema = z.object({
  items: z.array(compareRankItemSchema),
  preferences: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      weight: z.number().positive()
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
