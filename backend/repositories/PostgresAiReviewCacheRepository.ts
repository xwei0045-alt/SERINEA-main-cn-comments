import type { AiReviewResult } from "@/shared/contracts/aiReview";
import { aiReviewResultSchema } from "@/shared/contracts/aiReview";
import type { AiReviewCacheRepository } from "./AiReviewCacheRepository";
import type { PostgresDatabase } from "@/backend/database/PostgresDatabase";

export class PostgresAiReviewCacheRepository implements AiReviewCacheRepository {
  // 保存数据库依赖，缓存读写统一通过 PostgreSQL 完成。
  constructor(private readonly database: PostgresDatabase) {}

  // 按缓存键读取尚未过期的模型复核结果；缓存不可用时允许上层继续调用模型。
  async find(cacheKey: string): Promise<AiReviewResult | null> {
    try {
      const response = await this.database.query<{ result: unknown }>(
        `UPDATE ai_review_cache SET last_accessed_at = NOW(), hit_count = hit_count + 1
         WHERE cache_key = $1 RETURNING result`, [cacheKey]);
      return response.rows[0] ? aiReviewResultSchema.parse(response.rows[0].result) : null;
    } catch (error) {
      if (isCacheUnavailable(error)) return null;
      throw error;
    }
  }

  // 保存成功的复核结果，并通过唯一缓存键避免重复插入。
  async save(input: {
    cacheKey: string;
    modelVersion: string;
    policyVersion: string;
    result: AiReviewResult;
  }): Promise<void> {
    try {
      await this.database.query(
        `INSERT INTO ai_review_cache (cache_key, model_version, policy_version, result)
         VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT (cache_key) DO NOTHING`,
        [input.cacheKey, input.modelVersion, input.policyVersion, JSON.stringify(input.result)]);
    } catch (error) {
      if (!isCacheUnavailable(error)) throw error;
    }
  }
}

// 判断错误是否只是缓存表或连接暂时不可用，以便不阻断主推荐流程。
function isCacheUnavailable(error: unknown): boolean {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  return code === "42P01" || code === "42501";
}
