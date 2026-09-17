import { createHash } from "node:crypto";
import type { RecommendationExtraction } from "@/lib/recommendationAssistant";
import type { AiReviewResult, AiReviewResponse } from "@/shared/contracts/aiReview";
import { aiReviewResultSchema } from "@/shared/contracts/aiReview";
import type { AiReviewCacheRepository } from "@/backend/repositories/AiReviewCacheRepository";

export interface AiReviewProvider {
  // 作用：实现 review 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  review(message: string, deterministic: RecommendationExtraction): Promise<AiReviewResult>;
}

// 将对象按稳定键顺序序列化，保证同一输入每次都生成相同的缓存内容。
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// 作用：实现 normaliseReviewMessage 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
export function normaliseReviewMessage(message: string): string {
  return message.trim().replace(/\s+/g, " ").normalize("NFKC");
}

// 作用：实现 createAiReviewCacheKey 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
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

// 比较模型复核和本地确定性解析，组装前端需要的来源、差异和偏好结果。
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
      : "Cloud Qwen review refined the extracted preferences. Please confirm them before ranking.",
    source, modelVersion, policyVersion,
    preferences: result.preferences,
    unsupported: result.unsupported
  };
}

export class AiReviewService {
  // 保存缓存仓储、模型 Provider 和版本信息，版本变化会自然生成新的缓存键。
  constructor(private readonly options: {
    repository: AiReviewCacheRepository;
    provider: AiReviewProvider;
    modelVersion: string;
    policyVersion: string;
  }) {}

  // 先读取缓存，未命中时调用云端模型并保存成功结果，最后返回可确认的复核响应。
  async review(message: string, deterministic: RecommendationExtraction): Promise<AiReviewResponse> {
    const cacheKey = createAiReviewCacheKey({ message, deterministic,
      modelVersion: this.options.modelVersion, policyVersion: this.options.policyVersion });
    // 缓存用于降低延迟，但缓存故障不能阻断可选的模型推理。
    const cached = await this.options.repository.find(cacheKey).catch(() => null);
    if (cached) return responseFor(cached, deterministic, "cache",
      this.options.modelVersion, this.options.policyVersion);

    const result = aiReviewResultSchema.parse(await this.options.provider.review(message, deterministic));
    await this.options.repository.save({ cacheKey, modelVersion: this.options.modelVersion,
      policyVersion: this.options.policyVersion, result }).catch(() => undefined);
    return responseFor(result, deterministic, "inference",
      this.options.modelVersion, this.options.policyVersion);
  }
}
