import assert from "node:assert/strict";
import test from "node:test";
import { extractRecommendation } from "@/lib/recommendationAssistant";
import type { AiReviewResult } from "@/shared/contracts/aiReview";
import type { AiReviewCacheRepository } from "@/backend/repositories/AiReviewCacheRepository";
import { AiReviewService, createAiReviewCacheKey } from "./AiReviewService";

class MemoryRepository implements AiReviewCacheRepository {
  readonly values = new Map<string, AiReviewResult>();
  async find(key: string) { return this.values.get(key) ?? null; }
  async save(input: { cacheKey: string; result: AiReviewResult }) { this.values.set(input.cacheKey, input.result); }
}

test("cache key normalises whitespace and changes with policy or model version", () => {
  const deterministic = extractRecommendation("I need a library");
  const base = { message: " I need   a library ", deterministic, modelVersion: "qwen-v1", policyVersion: "policy-v1" };
  assert.equal(createAiReviewCacheKey(base), createAiReviewCacheKey({ ...base, message: "I need a library" }));
  assert.notEqual(createAiReviewCacheKey(base), createAiReviewCacheKey({ ...base, modelVersion: "qwen-v2" }));
  assert.notEqual(createAiReviewCacheKey(base), createAiReviewCacheKey({ ...base, policyVersion: "policy-v2" }));
});

test("successful inference is cached and reused", async () => {
  const repository = new MemoryRepository();
  let calls = 0;
  const result: AiReviewResult = { preferences: [{ target: "library", importance: "high" }], unsupported: [] };
  const service = new AiReviewService({ repository, modelVersion: "qwen-v1", policyVersion: "policy-v1",
    provider: { review: async () => { calls += 1; return result; } } });
  const deterministic = extractRecommendation("I need a library");
  assert.equal((await service.review("I need a library", deterministic)).source, "inference");
  assert.equal((await service.review(" I need  a library ", deterministic)).source, "cache");
  assert.equal(calls, 1);
});

test("provider failures are not cached", async () => {
  const repository = new MemoryRepository();
  const service = new AiReviewService({ repository, modelVersion: "qwen-v1", policyVersion: "policy-v1",
    provider: { review: async () => { throw new Error("timeout"); } } });
  const deterministic = extractRecommendation("I need a library");
  await assert.rejects(service.review("I need a library", deterministic));
  assert.equal(repository.values.size, 0);
});

test("cache read failures do not block inference", async () => {
  let providerCalls = 0;
  const result: AiReviewResult = { preferences: [{ target: "library", importance: "high" }], unsupported: [] };
  const service = new AiReviewService({
    repository: {
      find: async () => { throw new Error("cache unavailable"); },
      save: async () => { throw new Error("cache unavailable"); }
    },
    modelVersion: "qwen-v1",
    policyVersion: "policy-v1",
    provider: { review: async () => { providerCalls += 1; return result; } }
  });

  const response = await service.review("I need a library", extractRecommendation("I need a library"));
  assert.equal(response.source, "inference");
  assert.equal(providerCalls, 1);
});

test("a differing Qwen review tells the user that its refined preferences are shown", async () => {
  const service = new AiReviewService({
    repository: new MemoryRepository(),
    modelVersion: "qwen-v1",
    policyVersion: "policy-v1",
    provider: { review: async () => ({ preferences: [{ target: "library", importance: "high" }], unsupported: [] }) }
  });

  const response = await service.review("I need a pharmacy", extractRecommendation("I need a pharmacy"));
  assert.equal(response.agreed, false);
  assert.match(response.summary, /refined the extracted preferences/);
});
