import type { IncentiveRequest, IncentiveResponse } from "@/shared/contracts/incentives";

export class IncentiveApiClient {
  constructor(private readonly baseUrl = "") {}

  async find(input: IncentiveRequest, signal?: AbortSignal): Promise<IncentiveResponse> {
    const response = await fetch(`${this.baseUrl}/api/incentives`, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input)
    });
    if (!response.ok) {
      let message = "Incentive request failed.";
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        if (body.error?.message) message = body.error.message;
      } catch {
        /* ignore malformed error bodies */
      }
      throw new Error(message);
    }
    return await response.json() as IncentiveResponse;
  }
}

export const incentiveApiClient = new IncentiveApiClient();

