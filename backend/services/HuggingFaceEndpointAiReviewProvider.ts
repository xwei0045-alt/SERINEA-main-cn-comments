import type { RecommendationExtraction } from "@/lib/recommendationAssistant";
import { aiReviewResultSchema, type AiReviewResult } from "@/shared/contracts/aiReview";
import type { AiReviewProvider } from "./AiReviewService";

/** Calls the private Hugging Face endpoint while keeping its token on the server. */
export class HuggingFaceEndpointAiReviewProvider implements AiReviewProvider {
  constructor(private readonly options: {
    endpointUrl: string;
    token: string;
    timeoutMs: number;
    coldStartTimeoutMs: number;
    policyVersion: string;
    retryDelayMs?: number;
  }) {}

  async review(message: string, deterministic: RecommendationExtraction): Promise<AiReviewResult> {
    const deadline = Date.now() + this.options.coldStartTimeoutMs;
    const retryDelayMs = this.options.retryDelayMs ?? 5_000;

    while (true) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) throw new Error("Hugging Face endpoint did not finish starting in time.");
      const response = await fetch(this.options.endpointUrl.replace(/\/$/, ""), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.token}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          inputs: { message, deterministic, policyVersion: this.options.policyVersion }
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(Math.min(this.options.timeoutMs, remainingMs))
      });
      if (response.ok) return aiReviewResultSchema.parse(await response.json());

      // A scaled-to-zero endpoint returns these codes while its replica is loading.
      if (![502, 503, 504].includes(response.status) || Date.now() >= deadline) {
        throw new Error(`Hugging Face endpoint returned ${response.status}.`);
      }
      await new Promise<void>((resolve) => setTimeout(resolve, Math.min(retryDelayMs, deadline - Date.now())));
    }
  }
}
