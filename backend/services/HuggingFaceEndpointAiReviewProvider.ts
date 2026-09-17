import type { RecommendationExtraction } from "@/lib/recommendationAssistant";
import { aiReviewResultSchema, type AiReviewResult } from "@/shared/contracts/aiReview";
import type { AiReviewProvider } from "./AiReviewService";

/** Calls the private Hugging Face endpoint while keeping its token on the server. */
export class HuggingFaceEndpointAiReviewProvider implements AiReviewProvider {
  constructor(private readonly options: {
    endpointUrl: string;
    token: string;
    timeoutMs: number;
    policyVersion: string;
  }) {}

  async review(message: string, deterministic: RecommendationExtraction): Promise<AiReviewResult> {
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
      signal: AbortSignal.timeout(this.options.timeoutMs)
    });
    if (!response.ok) throw new Error(`Hugging Face endpoint returned ${response.status}.`);
    return aiReviewResultSchema.parse(await response.json());
  }
}
