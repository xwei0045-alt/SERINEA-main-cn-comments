import {
  localitySummaryResponseSchema,
  type LocalitySummaryResponse
} from "@/shared/contracts/localities";

export class LocalityApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "LocalityApiError";
  }
}

/** Browser client for town search. Selecting a match moves the map pin. */
export class LocalityApiClient {
  constructor(private readonly baseUrl = "") {}

  async search(
    query: { q: string; limit?: number },
    signal?: AbortSignal
  ): Promise<LocalitySummaryResponse> {
    const parameters = new URLSearchParams({
      q: query.q,
      limit: String(query.limit ?? 5000)
    });
    const response = await fetch(
      `${this.baseUrl}/api/localities?${parameters.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        signal
      }
    );

    if (!response.ok) {
      throw new LocalityApiError("Town search is temporarily unavailable.", response.status);
    }

    const parsed = localitySummaryResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new LocalityApiError("Town search returned an unexpected response.", 502);
    }
    return parsed.data;
  }
}

export const localityApiClient = new LocalityApiClient();
