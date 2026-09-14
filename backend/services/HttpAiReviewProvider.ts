import type { RecommendationExtraction } from "@/lib/recommendationAssistant";
import { aiReviewResultSchema, type AiReviewResult } from "@/shared/contracts/aiReview";
import type { AiReviewProvider } from "./AiReviewService";

export class HttpAiReviewProvider implements AiReviewProvider {
  constructor(private readonly options: { baseUrl: string; timeoutMs: number; policyVersion: string }) {}

  async review(message: string, deterministic: RecommendationExtraction): Promise<AiReviewResult> {
    const response = await fetch(`${this.options.baseUrl.replace(/\/$/, "")}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ message, deterministic, policyVersion: this.options.policyVersion }),
      cache: "no-store",
      signal: AbortSignal.timeout(this.options.timeoutMs)
    });
    if (!response.ok) throw new Error(`AI review provider returned ${response.status}.`);
    return aiReviewResultSchema.parse(await response.json());
  }
}
