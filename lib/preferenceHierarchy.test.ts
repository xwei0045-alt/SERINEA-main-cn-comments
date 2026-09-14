import assert from "node:assert/strict";
import test from "node:test";
import { toggleHierarchicalPreference } from "./preferenceHierarchy";

test("a broad category replaces selected children from the same branch", () => {
  assert.deepEqual(
    toggleHierarchicalPreference(["school", "childcare", "doctor"], "education"),
    ["doctor", "education"]
  );
});

test("a specific type replaces its broad category without affecting other branches", () => {
  assert.deepEqual(
    toggleHierarchicalPreference(["education", "healthcare"], "college"),
    ["healthcare", "college"]
  );
});

test("multiple subcategories in one branch can be selected", () => {
  assert.deepEqual(
    toggleHierarchicalPreference(["school"], "childcare"),
    ["school", "childcare"]
  );
});
