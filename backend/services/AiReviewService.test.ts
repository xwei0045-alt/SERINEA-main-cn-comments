import assert from "node:assert/strict";
import test from "node:test";
import { extractRecommendation } from "@/lib/recommendationAssistant";
import type { AiReviewResult } from "@/shared/contracts/aiReview";
import { AiReviewService } from "./AiReviewService";

test("every review calls the provider instead of reusing a cached result", async () => {
  let calls = 0;
  const result: AiReviewResult = { preferences: [{ target: "library", importance: "high" }], unsupported: [] };
  const service = new AiReviewService({ modelVersion: "qwen-v1", policyVersion: "policy-v1",
    provider: { review: async () => { calls += 1; return result; } } });
  const deterministic = extractRecommendation("I need a library");
  assert.equal((await service.review("I need a library", deterministic)).source, "inference");
  assert.equal((await service.review(" I need  a library ", deterministic)).source, "inference");
  assert.equal(calls, 2);
});

test("provider failures are returned to the caller", async () => {
  const service = new AiReviewService({ modelVersion: "qwen-v1", policyVersion: "policy-v1",
    provider: { review: async () => { throw new Error("timeout"); } } });
  const deterministic = extractRecommendation("I need a library");
  await assert.rejects(service.review("I need a library", deterministic));
});

test("a differing Qwen review tells the user that its refined preferences are shown", async () => {
  const service = new AiReviewService({
    modelVersion: "qwen-v1",
    policyVersion: "policy-v1",
    provider: { review: async () => ({ preferences: [{ target: "library", importance: "high" }], unsupported: [] }) }
  });

  const response = await service.review("I need a pharmacy", extractRecommendation("I need a pharmacy"));
  assert.equal(response.agreed, false);
  assert.match(response.summary, /refined the extracted preferences/);
});
