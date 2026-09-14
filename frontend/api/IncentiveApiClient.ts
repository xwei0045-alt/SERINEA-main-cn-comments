import type { IncentiveRequest, IncentiveResponse } from "@/shared/contracts/incentives";

/**
 * Browser client for POST /api/incentives.
 *
 * COMES FROM: app/ai-assistant/AssistantClient.tsx (after lifestyle ranking).
 * GOES TO: app/api/incentives/route.ts → IncentiveService → SubsidyRepository.
 * CONTRACT: shared/contracts/incentives.ts (must stay in sync with backend).
 */
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

