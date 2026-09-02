import { z } from "zod";
import { WINDOW_MINUTES } from "@/lib/types";

/**
 * Place categories shared by the frontend and backend.
 * Keeping them here prevents the frontend from sending unknown category names.
 */
export const POI_CATEGORY_IDS = [
  "food",
  "shops",
  "gym",
  "grocery",
  "gp",
  "pharmacy",
  "park",
  "museum"
] as const;

export const poiCategorySchema = z.enum(POI_CATEGORY_IDS);
export type PoiCategoryId = z.infer<typeof poiCategorySchema>;

/** Converts comma-separated URL categories into an array and rejects unknown values. */
const categoryListSchema = z
  .string()
  .trim()
  .optional()
  .transform((value, context): PoiCategoryId[] | undefined => {
    if (!value) return undefined;

    const values = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const invalidValues = values.filter(
      (item) => !POI_CATEGORY_IDS.includes(item as PoiCategoryId)
    );

    if (invalidValues.length > 0) {
      context.addIssue({
        code: "custom",
        message: `Unknown categories: ${invalidValues.join(", ")}`
      });
      return [];
    }

    return [...new Set(values)] as PoiCategoryId[];
  });

/**
 * Validation rules for /api/reach query parameters.
 * The current product uses a fixed 15-minute round trip, so other values are rejected.
 */
export const reachQuerySchema = z
  .object({
    lat: z.coerce.number().finite().min(-90).max(90),
    lng: z.coerce.number().finite().min(-180).max(180),
    window: z.coerce
      .number()
      .int()
      .refine((value) => value === WINDOW_MINUTES, {
        message: `The current product only supports ${WINDOW_MINUTES} minutes.`
      })
      .default(WINDOW_MINUTES),
    categories: categoryListSchema
  })
  .transform(({ lat, lng, window, categories }) => ({
    pin: { lat, lng },
    windowMinutes: window,
    categories
  }));

export type ReachQuery = z.infer<typeof reachQuerySchema>;

/** These schemas check backend responses at runtime instead of relying only on TypeScript. */
const legSchema = z.object({
  mode: z.enum(["walk", "tram", "train", "bus"]),
  minutes: z.number().finite().nonnegative(),
  text: z.string()
});

const poiSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: poiCategorySchema,
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  suburb: z.string()
});

const journeySchema = z.object({
  outbound: z.array(legSchema),
  inbound: z.array(legSchema),
  outboundMinutes: z.number().finite().positive(),
  inboundMinutes: z.number().finite().positive(),
  roundTripMinutes: z.number().finite().positive()
});

const sourceStampSchema = z.object({
  name: z.string(),
  date: z.string(),
  note: z.string()
});

/**
 * Complete result returned to the map page.
 * The database implementation will keep this shape, so the frontend will not need another rewrite.
 */
export const reachResponseSchema = z.object({
  reachable: z.array(
    z.object({
      poi: poiSchema,
      journey: journeySchema
    })
  ),
  outboundOnlyCount: z.number().int().nonnegative(),
  water: z.enum(["bay", "lake", "harbour"]).nullable(),
  hull: z.array(
    z.object({
      lat: z.number().finite().min(-90).max(90),
      lng: z.number().finite().min(-180).max(180)
    })
  ),
  windowMinutes: z.number().int().positive(),
  dataSource: z.enum(["demo", "csv", "database"]),
  generatedAt: z.string().datetime(),
  sources: z.object({
    poi: sourceStampSchema,
    transit: sourceStampSchema
  })
});

export type ReachResponse = z.infer<typeof reachResponseSchema>;
