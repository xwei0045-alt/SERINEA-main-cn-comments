import type { LatLng } from "@/lib/types";
import {
  reachResponseSchema,
  type PoiCategoryId,
  type ReachResponse
} from "@/shared/contracts/reach";

export type ReachApiRequest = {
  pin: LatLng;
  windowMinutes: number;
  categories?: PoiCategoryId[];
};

/** Error containing the HTTP status returned by the reachability API. */
export class ReachApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ReachApiError";
  }
}

/**
 * Browser-side client for the reachability API.
 * Components use this class instead of building URLs and parsing JSON themselves.
 */
export class ReachApiClient {
  constructor(private readonly baseUrl = "") {}

  /** Requests one reachability calculation and validates the returned data. */
  async search(
    request: ReachApiRequest,
    signal?: AbortSignal
  ): Promise<ReachResponse> {
    const parameters = new URLSearchParams({
      lat: String(request.pin.lat),
      lng: String(request.pin.lng),
      window: String(request.windowMinutes)
    });

    if (request.categories?.length) {
      parameters.set("categories", request.categories.join(","));
    }

    const response = await fetch(
      `${this.baseUrl}/api/reach?${parameters.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        signal
      }
    );

    if (!response.ok) {
      throw new ReachApiError(
        "The server could not calculate reachable places.",
        response.status
      );
    }

    const payload: unknown = await response.json();
    const parsedPayload = reachResponseSchema.safeParse(payload);

    if (!parsedPayload.success) {
      throw new ReachApiError(
        "The server returned an unexpected response format.",
        502
      );
    }

    return parsedPayload.data;
  }
}

/** Shared client used by the map page. */
export const reachApiClient = new ReachApiClient();
