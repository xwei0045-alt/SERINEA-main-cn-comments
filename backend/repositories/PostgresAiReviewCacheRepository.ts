import type { AiReviewResult } from "@/shared/contracts/aiReview";
import { aiReviewResultSchema } from "@/shared/contracts/aiReview";
import type { AiReviewCacheRepository } from "./AiReviewCacheRepository";
import type { PostgresDatabase } from "@/backend/database/PostgresDatabase";

export class PostgresAiReviewCacheRepository implements AiReviewCacheRepository {
  constructor(private readonly database: PostgresDatabase) {}

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

function isCacheUnavailable(error: unknown): boolean {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  return code === "42P01" || code === "42501";
}
