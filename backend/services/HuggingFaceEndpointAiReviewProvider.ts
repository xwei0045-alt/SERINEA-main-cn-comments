import type { RecommendationExtraction } from "@/lib/recommendationAssistant";
import { aiReviewResultSchema, type AiReviewResult } from "@/shared/contracts/aiReview";
import type { AiReviewProvider } from "./AiReviewService";

// 调用私有 Hugging Face Endpoint；令牌只在服务端使用，不发送到浏览器。
export class HuggingFaceEndpointAiReviewProvider implements AiReviewProvider {
  constructor(private readonly options: {
    endpointUrl: string;
    token: string;
    timeoutMs: number;
    coldStartTimeoutMs: number;
    policyVersion: string;
    retryDelayMs?: number;
  }) {}

  // 发送用户消息和确定性解析结果；遇到冷启动状态码时在截止时间内重试。
  async review(message: string, deterministic: RecommendationExtraction): Promise<AiReviewResult> {
    const deadline = Date.now() + this.options.coldStartTimeoutMs;
    const retryDelayMs = this.options.retryDelayMs ?? 5_000;

    // 作用：实现 while 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
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

      // Endpoint 缩容到零时，副本启动阶段可能返回这些状态码。
      if (![502, 503, 504].includes(response.status) || Date.now() >= deadline) {
        throw new Error(`Hugging Face endpoint returned ${response.status}.`);
      }
      await new Promise<void>((resolve) => setTimeout(resolve, Math.min(retryDelayMs, deadline - Date.now())));
    }
  }
}
