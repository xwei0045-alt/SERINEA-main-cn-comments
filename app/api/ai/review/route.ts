import { NextResponse } from "next/server";
import { extractRecommendation } from "@/lib/recommendationAssistant";
import { aiReviewRequestSchema } from "@/shared/contracts/aiReview";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { PostgresAiReviewCacheRepository } from "@/backend/repositories/PostgresAiReviewCacheRepository";
import { AiReviewService } from "@/backend/services/AiReviewService";
import { HttpAiReviewProvider } from "@/backend/services/HttpAiReviewProvider";
import { HuggingFaceAiReviewProvider } from "@/backend/services/HuggingFaceAiReviewProvider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const modelVersion = process.env.AI_REVIEW_MODEL_VERSION?.trim() || "qwen3-0.6b-q4f16-v1";
  const policyVersion = process.env.AI_REVIEW_POLICY_VERSION?.trim() || "serinea-review-v1";
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send valid JSON." }, { status: 400 });
  }
  const parsed = aiReviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Send a message containing 1 to 2000 characters." }, { status: 400 });
  }
  try {
    const deterministic = extractRecommendation(parsed.data.message);
    const databaseUrl = process.env.DATABASE_URL?.trim();
    const baseUrl = process.env.AI_REVIEW_BASE_URL?.trim();
    const hfToken = process.env.HF_TOKEN?.trim();
    if (!databaseUrl || (!baseUrl && !hfToken)) throw new Error("AI review is not configured.");
    const timeout = Number(process.env.AI_REVIEW_TIMEOUT_MS || 8000);
    const provider = baseUrl
      ? new HttpAiReviewProvider({ baseUrl, timeoutMs: Number.isFinite(timeout) ? timeout : 8000, policyVersion })
      : new HuggingFaceAiReviewProvider({
          token: hfToken!,
          model: process.env.HF_MODEL?.trim() || "serinea-qwen3-browser-model/serinea-qwen3-browser-model",
          timeoutMs: Number.isFinite(timeout) ? timeout : 8000
        });
    const service = new AiReviewService({
      repository: new PostgresAiReviewCacheRepository(PostgresDatabase.getInstance(databaseUrl)),
      provider,
      modelVersion, policyVersion
    });
    return NextResponse.json(await service.review(parsed.data.message, deterministic),
      { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({
      agreed: false,
      summary: "Cloud Qwen review was unavailable. Deterministic extraction remained active.",
      source: "fallback",
      modelVersion,
      policyVersion
    }, { headers: { "Cache-Control": "no-store" } });
  }
}
