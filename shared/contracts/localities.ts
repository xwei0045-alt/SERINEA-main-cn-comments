import { z } from "zod";

/** Query accepted by the locality summary endpoint. */
export const localitySummaryQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export type LocalitySummaryQuery = z.infer<typeof localitySummaryQuerySchema>;

const subcategorySummarySchema = z.object({
  subcategory: z.string(),
  displayName: z.string(),
  poiCount: z.number().int().nonnegative()
});

const categorySummarySchema = z.object({
  category: z.string(),
  poiCount: z.number().int().nonnegative(),
  subcategories: z.array(subcategorySummarySchema)
});

export const localitySummaryItemSchema = z.object({
  locality: z.string(),
  lgaName: z.string(),
  regionalGroup: z.string(),
  totalPoiCount: z.number().int().nonnegative(),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  categories: z.array(categorySummarySchema)
});

export type LocalitySummaryItem = z.infer<typeof localitySummaryItemSchema>;

/** Response generated from the supplied locality summary CSV. */
export const localitySummaryResponseSchema = z.object({
  items: z.array(localitySummaryItemSchema),
  totalMatches: z.number().int().nonnegative(),
  totalLocalities: z.number().int().nonnegative(),
  totalPois: z.number().int().nonnegative(),
  dataSource: z.enum(["csv", "database"]),
  generatedAt: z.string().datetime()
});

export type LocalitySummaryResponse = z.infer<typeof localitySummaryResponseSchema>;
