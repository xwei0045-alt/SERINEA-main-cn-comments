import { createHash } from "node:crypto";
import type { RecommendationExtraction } from "@/lib/recommendationAssistant";
import type { AiReviewResult, AiReviewResponse } from "@/shared/contracts/aiReview";
import { aiReviewResultSchema } from "@/shared/contracts/aiReview";
import type { AiReviewCacheRepository } from "@/backend/repositories/AiReviewCacheRepository";

export interface AiReviewProvider {
  review(message: string, deterministic: RecommendationExtraction): Promise<AiReviewResult>;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function normaliseReviewMessage(message: string): string {
  return message.trim().replace(/\s+/g, " ").normalize("NFKC");
}

export function createAiReviewCacheKey(input: {
  message: string;
  deterministic: RecommendationExtraction;
  modelVersion: string;
  policyVersion: string;
}): string {
  return createHash("sha256").update(canonical({
    message: normaliseReviewMessage(input.message),
    deterministic: input.deterministic,
    modelVersion: input.modelVersion,
    policyVersion: input.policyVersion
  })).digest("hex");
}

function responseFor(result: AiReviewResult, deterministic: RecommendationExtraction,
  source: "cache" | "inference", modelVersion: string, policyVersion: string): AiReviewResponse {
  const expected = deterministic.preferences
    .map(({ target, importance }) => ({ target, importance }))
    .sort((left, right) => left.target.localeCompare(right.target));
  const actual = result.preferences.slice().sort((left, right) => left.target.localeCompare(right.target));
  const agreed = canonical(expected) === canonical(actual);
  return {
    agreed,
    summary: agreed
      ? `Cloud Qwen review agreed with the catalogue extraction (${source}).`
      : "Cloud Qwen review differed, so the website kept the deterministic extraction for confirmation.",
    source, modelVersion, policyVersion,
    preferences: result.preferences,
    unsupported: result.unsupported
  };
}

export class AiReviewService {
  constructor(private readonly options: {
    repository: AiReviewCacheRepository;
    provider: AiReviewProvider;
    modelVersion: string;
    policyVersion: string;
  }) {}

  async review(message: string, deterministic: RecommendationExtraction): Promise<AiReviewResponse> {
    const cacheKey = createAiReviewCacheKey({ message, deterministic,
      modelVersion: this.options.modelVersion, policyVersion: this.options.policyVersion });
    const cached = await this.options.repository.find(cacheKey);
    if (cached) return responseFor(cached, deterministic, "cache",
      this.options.modelVersion, this.options.policyVersion);

    const result = aiReviewResultSchema.parse(await this.options.provider.review(message, deterministic));
    await this.options.repository.save({ cacheKey, modelVersion: this.options.modelVersion,
      policyVersion: this.options.policyVersion, result });
    return responseFor(result, deterministic, "inference",
      this.options.modelVersion, this.options.policyVersion);
  }
}
