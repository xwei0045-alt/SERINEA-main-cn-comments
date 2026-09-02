import { z } from "zod";

const latLngSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180)
});

export const walkQuerySchema = z
  .object({
    fromLat: z.coerce.number().finite().min(-90).max(90),
    fromLng: z.coerce.number().finite().min(-180).max(180),
    toLat: z.coerce.number().finite().min(-90).max(90),
    toLng: z.coerce.number().finite().min(-180).max(180),
    roundtrip: z
      .enum(["0", "1", "true", "false"])
      .optional()
      .transform((value) => value === "1" || value === "true")
  })
  .transform(({ fromLat, fromLng, toLat, toLng, roundtrip }) => ({
    from: { lat: fromLat, lng: fromLng },
    to: { lat: toLat, lng: toLng },
    roundtrip: roundtrip ?? false
  }));

export type WalkQuery = z.infer<typeof walkQuerySchema>;

export const walkStepSchema = z.object({
  instruction: z.string(),
  distanceMeters: z.number().finite().nonnegative(),
  location: latLngSchema
});

export const walkLegSchema = z.object({
  id: z.enum(["there", "back"]),
  distanceMeters: z.number().finite().nonnegative(),
  durationSeconds: z.number().finite().nonnegative(),
  path: z.array(latLngSchema).min(2),
  steps: z.array(walkStepSchema)
});

export const walkRouteResponseSchema = z.object({
  distanceMeters: z.number().finite().nonnegative(),
  durationSeconds: z.number().finite().nonnegative(),
  path: z.array(latLngSchema).min(2),
  legs: z.array(walkLegSchema).min(1),
  source: z.string()
});

export type WalkStep = z.infer<typeof walkStepSchema>;
export type WalkLeg = z.infer<typeof walkLegSchema>;
export type WalkRouteResponse = z.infer<typeof walkRouteResponseSchema>;
