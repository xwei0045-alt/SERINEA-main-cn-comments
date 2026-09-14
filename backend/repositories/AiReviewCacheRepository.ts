import type { AiReviewResult } from "@/shared/contracts/aiReview";

export interface AiReviewCacheRepository {
  find(cacheKey: string): Promise<AiReviewResult | null>;
  save(input: {
    cacheKey: string;
    modelVersion: string;
    policyVersion: string;
    result: AiReviewResult;
  }): Promise<void>;
}
