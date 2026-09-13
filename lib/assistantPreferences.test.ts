import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assistantPredictionSchema, assistantRequestSchema, preferenceKey, suggestedPreferences,
} from "./assistantPreferences";

test("assistant request rejects empty or oversized messages", () => {
  assert.equal(assistantRequestSchema.safeParse({ message: "  " }).success, false);
  assert.equal(assistantRequestSchema.safeParse({ message: "x".repeat(501) }).success, false);
  assert.equal(assistantRequestSchema.safeParse({ message: "Add parks" }).success, true);
});

test("model suggestion becomes a draft without changing confirmed preferences", () => {
  const current = ["grocery", "school", "gp", "park"];
  const prediction = assistantPredictionSchema.parse({
    status: "needs_confirmation", include: ["library"], exclude: ["park"], conflicts: [],
  });
  assert.deepEqual(suggestedPreferences(current, prediction), ["grocery", "school", "gp", "library"]);
  assert.deepEqual(current, ["grocery", "school", "gp", "park"]);
  assert.deepEqual(suggestedPreferences(["library"], prediction), ["library"]);
});

test("clarification keeps current preferences and invalid predictions are rejected", () => {
  const clarification = assistantPredictionSchema.parse({
    status: "needs_clarification", include: [], exclude: [], conflicts: [],
  });
  assert.deepEqual(suggestedPreferences(["school"], clarification), ["school"]);
  for (const invalid of [
    { status: "needs_confirmation", include: ["school"], exclude: ["school"], conflicts: [] },
    { status: "needs_confirmation", include: ["unknown"], exclude: [], conflicts: [] },
    { status: "needs_confirmation", include: [], exclude: [], conflicts: [] },
    { status: "needs_clarification", include: ["school"], exclude: [], conflicts: [] },
    { status: "needs_confirmation", include: ["school", "school"], exclude: [], conflicts: [] },
  ]) assert.equal(assistantPredictionSchema.safeParse(invalid).success, false);
});

test("draft freshness depends on membership, not array order", () => {
  assert.equal(preferenceKey(["school", "park"]), preferenceKey(["park", "school"]));
  assert.notEqual(preferenceKey(["school"]), preferenceKey(["park", "school"]));
});
