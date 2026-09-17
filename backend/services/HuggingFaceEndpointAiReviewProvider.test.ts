import assert from "node:assert/strict";
import test from "node:test";
import { extractRecommendation } from "@/lib/recommendationAssistant";
import { HuggingFaceEndpointAiReviewProvider } from "./HuggingFaceEndpointAiReviewProvider";

test("Hugging Face endpoint receives the authenticated deterministic review contract", async () => {
  const originalFetch = globalThis.fetch;
  let receivedUrl = "";
  let receivedAuthorization = "";
  let receivedBody: unknown;
  globalThis.fetch = async (input, init) => {
    receivedUrl = String(input);
    receivedAuthorization = new Headers(init?.headers).get("Authorization") || "";
    receivedBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      preferences: [{ target: "library", importance: "high" }],
      unsupported: []
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const extraction = extractRecommendation("A library is essential.");
    const result = await new HuggingFaceEndpointAiReviewProvider({
      endpointUrl: "https://serinea.example.endpoints.huggingface.cloud/",
      token: "test-token",
      timeoutMs: 1_000,
      coldStartTimeoutMs: 1_000,
      policyVersion: "serinea-review-v1"
    }).review("A library is essential.", extraction);

    assert.equal(receivedUrl, "https://serinea.example.endpoints.huggingface.cloud");
    assert.equal(receivedAuthorization, "Bearer test-token");
    assert.deepEqual(receivedBody, { inputs: {
      message: "A library is essential.", deterministic: extraction,
      policyVersion: "serinea-review-v1"
    } });
    assert.deepEqual(result.preferences, [{ target: "library", importance: "high" }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Hugging Face endpoint waits through a scale-to-zero startup response", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts === 1) return new Response("starting", { status: 502 });
    return new Response(JSON.stringify({ preferences: [], unsupported: [] }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const result = await new HuggingFaceEndpointAiReviewProvider({
      endpointUrl: "https://serinea.example.endpoints.huggingface.cloud",
      token: "test-token",
      timeoutMs: 1_000,
      coldStartTimeoutMs: 1_000,
      retryDelayMs: 0,
      policyVersion: "serinea-review-v1"
    }).review("Hello", extractRecommendation("Hello"));
    assert.equal(attempts, 2);
    assert.deepEqual(result, { preferences: [], unsupported: [] });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
