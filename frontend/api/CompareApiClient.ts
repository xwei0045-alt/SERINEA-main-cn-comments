import {
  compareResponseSchema,
  type CompareResponse
} from "@/shared/contracts/compare";

export class CompareApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "CompareApiError";
  }
}

export class CompareApiClient {
  constructor(private readonly baseUrl = "") {}

  async rank(
    input: { prefs: string[]; weights?: number[]; limit?: number; q?: string },
    signal?: AbortSignal
  ): Promise<CompareResponse> {
    const parameters = new URLSearchParams();
    parameters.set("prefs", input.prefs.join(","));
    if (input.weights) parameters.set("weights", input.weights.join(","));
    if (input.limit != null) parameters.set("limit", String(input.limit));
    if (input.q) parameters.set("q", input.q);

    const response = await fetch(`${this.baseUrl}/api/compare?${parameters}`, {
      signal,
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      let message = "Compare request failed.";
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        if (body.error?.message) message = body.error.message;
      } catch {
        /* ignore */
      }
      throw new CompareApiError(message, response.status);
    }

    return compareResponseSchema.parse(await response.json());
  }
}

export const compareApiClient = new CompareApiClient();
