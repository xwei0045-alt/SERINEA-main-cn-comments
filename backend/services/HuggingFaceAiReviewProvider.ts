import type { RecommendationExtraction } from "@/lib/recommendationAssistant";
import { aiReviewResultSchema, type AiReviewResult } from "@/shared/contracts/aiReview";
import type { AiReviewProvider } from "./AiReviewService";

type Completion = { choices?: Array<{ message?: { content?: string | null } }> };

function parseJsonObject(content: string): unknown {
  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?|```/gi, "").trim();
  try { return JSON.parse(cleaned); } catch { /* extract the first balanced object below */ }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  throw new Error("Hugging Face returned invalid review JSON.");
}

function normaliseReviewShape(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  const unsupported = typeof record.unsupported === "string"
    ? (record.unsupported.trim() ? [record.unsupported.trim()] : [])
    : record.unsupported;
  return { ...record, unsupported };
}

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
          { role: "system", content: `Return JSON only with preferences [{target, importance}] and unsupported [string]. Importance must be very_high, high, medium, low or very_low. Review only the deterministic catalogue extraction; never invent targets.` },
          { role: "user", content: JSON.stringify({ message, deterministic }) }
        ]
      }),
      signal: AbortSignal.timeout(this.options.timeoutMs)
    });
    if (!response.ok) throw new Error(`Hugging Face returned ${response.status}.`);
    const decoded = (await response.json()) as Completion;
    const content = decoded.choices?.[0]?.message?.content;
    if (!content) throw new Error("Hugging Face returned no review.");
    return aiReviewResultSchema.parse(normaliseReviewShape(parseJsonObject(content)));
  }
}
