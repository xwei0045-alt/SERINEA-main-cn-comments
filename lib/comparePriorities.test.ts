import assert from "node:assert/strict";
import { test } from "node:test";
import { applyPreferenceSelection, movePreference, preferenceWeights } from "./comparePriorities";

test("priority controls: reorder, weights and AI selection preserve the intended state", () => {
  const initial = ["grocery", "school", "gp", "park"];
  const reordered = movePreference(initial, 3, 0);
  assert.deepEqual(reordered, ["park", "grocery", "school", "gp"]);
  assert.deepEqual(initial, ["grocery", "school", "gp", "park"]);
  assert.deepEqual(movePreference(reordered, 0, 3), initial);
  assert.equal(movePreference(initial, 0, -1), initial);
  assert.equal(movePreference(initial, 0, 4), initial);
  assert.equal(movePreference(initial, 1, 1), initial);
  assert.deepEqual(preferenceWeights(4, false), [0.25, 0.25, 0.25, 0.25]);
  assert.deepEqual(preferenceWeights(4, true), [0.4, 0.3, 0.2, 0.1]);
  assert.deepEqual(preferenceWeights(0, true), []);
  assert.deepEqual(preferenceWeights(0, false), []);
  assert.deepEqual(preferenceWeights(1, true), [1]);
  assert.ok(Math.abs(preferenceWeights(3, true).reduce((a, b) => a + b, 0) - 1) < 1e-10);
  // A draft made before a reorder must not restore the previous order.
  assert.deepEqual(applyPreferenceSelection(reordered, initial), reordered);
  assert.deepEqual(applyPreferenceSelection(reordered, ["grocery", "gp", "library"]), ["grocery", "gp", "library"]);
  assert.deepEqual(applyPreferenceSelection(reordered, ["library", "library", "park"]), ["park", "library"]);
  assert.deepEqual(applyPreferenceSelection(reordered, []), []);
});
