import type { AiReviewResult } from "@/shared/contracts/aiReview";

export interface AiReviewCacheRepository {
  // 作用：实现 find 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  find(cacheKey: string): Promise<AiReviewResult | null>;
  save(input: {
    cacheKey: string;
    modelVersion: string;
    policyVersion: string;
    result: AiReviewResult;
  }): Promise<void>;
}
