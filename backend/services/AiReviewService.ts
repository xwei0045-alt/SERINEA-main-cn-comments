import type { RecommendationExtraction } from "@/lib/recommendationAssistant";
import type { AiReviewResult, AiReviewResponse } from "@/shared/contracts/aiReview";
import { aiReviewResultSchema } from "@/shared/contracts/aiReview";

export interface AiReviewProvider {
  // 作用：实现 review 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  review(message: string, deterministic: RecommendationExtraction): Promise<AiReviewResult>;
}

// 将对象按稳定键顺序序列化，用于比较本地解析结果与模型结果。
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
// 比较模型复核和本地确定性解析，组装前端需要的来源、差异和偏好结果。
function responseFor(result: AiReviewResult, deterministic: RecommendationExtraction,
  modelVersion: string, policyVersion: string): AiReviewResponse {
  const expected = deterministic.preferences
    .map(({ target, importance }) => ({ target, importance }))
    .sort((left, right) => left.target.localeCompare(right.target));
  const actual = result.preferences.slice().sort((left, right) => left.target.localeCompare(right.target));
  const agreed = canonical(expected) === canonical(actual);
  return {
    agreed,
    summary: agreed
      ? "Cloud Qwen review agreed with the catalogue extraction (inference)."
      : "Cloud Qwen review refined the extracted preferences. Please confirm them before ranking.",
    source: "inference", modelVersion, policyVersion,
    preferences: result.preferences,
    unsupported: result.unsupported
  };
}

export class AiReviewService {
  constructor(private readonly options: {
    provider: AiReviewProvider;
    modelVersion: string;
    policyVersion: string;
  }) {}

  // 每次请求都直接调用云端模型，避免旧缓存覆盖当前模型的最新判断。
  async review(message: string, deterministic: RecommendationExtraction): Promise<AiReviewResponse> {
    const result = aiReviewResultSchema.parse(await this.options.provider.review(message, deterministic));
    return responseFor(result, deterministic,
      this.options.modelVersion, this.options.policyVersion);
  }
}
