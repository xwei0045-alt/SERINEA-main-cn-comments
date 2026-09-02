import {
  walkRouteResponseSchema,
  type WalkRouteResponse
} from "@/shared/contracts/walkRoute";
import type { LatLng } from "@/lib/types";

export class WalkRouteApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "WalkRouteApiError";
  }
}

// Browser helper for /api/walk so the map page does not build the query string itself.
export class WalkRouteApiClient {
  constructor(private readonly baseUrl = "") {}

  async fetchRoute(
    input: { from: LatLng; to: LatLng; roundtrip?: boolean },
    signal?: AbortSignal
  ): Promise<WalkRouteResponse> {
    const parameters = new URLSearchParams({
      fromLat: String(input.from.lat),
      fromLng: String(input.from.lng),
      toLat: String(input.to.lat),
      toLng: String(input.to.lng)
    });
    if (input.roundtrip) parameters.set("roundtrip", "1");

    const response = await fetch(`${this.baseUrl}/api/walk?${parameters.toString()}`, {
      method: "GET",
      cache: "no-store",
      signal
    });

    if (!response.ok) {
      throw new WalkRouteApiError(
        "A street walking route could not be found.",
        response.status
      );
    }

    const parsed = walkRouteResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new WalkRouteApiError("The walking route response was unexpected.", 502);
    }
    return parsed.data;
  }
}

export const walkRouteApiClient = new WalkRouteApiClient();
