import type { RecommendationExtraction } from "@/lib/recommendationAssistant";
import { aiReviewResultSchema, type AiReviewResult } from "@/shared/contracts/aiReview";
import type { AiReviewProvider } from "./AiReviewService";

type Completion = { choices?: Array<{ message?: { content?: string | null } }> };

/** Server-only Hugging Face Inference Providers adapter. The token never reaches the browser. */
export class HuggingFaceAiReviewProvider implements AiReviewProvider {
  constructor(private readonly options: { token: string; model: string; timeoutMs: number }) {}

  async review(message: string, deterministic: RecommendationExtraction): Promise<AiReviewResult> {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.options.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.options.model,
        temperature: 0,
        max_tokens: 220,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Return JSON only: {\\"preferences\\":[{\\"target\\":string,\\"importance\\":\\"very_high|high|medium|low|very_low\\"}],\\"unsupported\\":[string]}. Review only the deterministic catalogue extraction; never invent targets." },
          { role: "user", content: JSON.stringify({ message, deterministic }) }
        ]
      }),
      signal: AbortSignal.timeout(this.options.timeoutMs)
    });
    if (!response.ok) throw new Error(`Hugging Face returned ${response.status}.`);
    const decoded = (await response.json()) as Completion;
    const content = decoded.choices?.[0]?.message?.content;
    if (!content) throw new Error("Hugging Face returned no review.");
    return aiReviewResultSchema.parse(JSON.parse(content));
  }
}
