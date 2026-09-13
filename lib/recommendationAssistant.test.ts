import assert from "node:assert/strict";
import test from "node:test";
import cases from "@/features/ai-assistant/evaluation/frozen-cases.json";
import { extractRecommendation, mergeRecommendationState, emptyRecommendationState } from "./recommendationAssistant";

type Expected = {
  intent: string;
  relocation_stage: string;
  age: number | null;
  income: number | null;
  income_scope: string;
  income_period: string;
  income_basis: string;
  has_child: boolean | null;
  child_ages: number[];
  locality: string | null;
  lga_name: string | null;
  move_distance_km: number | null;
  days_since_move: number | null;
  new_resident: boolean | null;
  needs_incentive_guidance: boolean;
  unsupported_count: number;
  preferences: string[][];
};

function comparable(input: string) {
  const value = extractRecommendation(input);
  return {
    intent: value.intent,
    relocation_stage: value.relocation_stage,
    ...value.profile,
    needs_incentive_guidance: value.needs_incentive_guidance,
    unsupported_count: value.unsupported.length,
    preferences: value.preferences
      .map((preference) => [preference.target, preference.importance])
      .sort((first, second) => first[0].localeCompare(second[0]))
  };
}

for (const [setName, records] of Object.entries(cases)) {
  test(`${setName} frozen extraction cases`, () => {
    const failures: Array<{ input: string; actual: ReturnType<typeof comparable>; expected: Expected }> = [];
    for (const record of records as Array<{ input: string; expected: Expected }>) {
      const actual = comparable(record.input);
      try {
        assert.deepEqual(actual, record.expected);
      } catch {
        failures.push({ input: record.input, actual, expected: record.expected });
      }
    }
    assert.deepEqual(failures, []);
  });
}

test("a follow-up correction removes and reprioritises preferences", () => {
  const first = mergeRecommendationState(
    emptyRecommendationState(),
    extractRecommendation("We plan to move. A dentist is essential and I prefer a library.")
  );
  const corrected = mergeRecommendationState(
    first,
    extractRecommendation("Remove the dentist. The library is only a minor bonus.")
  );
  assert.deepEqual(
    corrected.preferences.map(({ target, importance }) => [target, importance]),
    [["library", "very_low"]]
  );
});

test("moving support enters the incentive flow and preserves explicit facts", () => {
  const extracted = extractRecommendation(
    "I am 28 and recently moved 60 km to Lucas 30 days ago. I am a new resident. " +
    "My annual gross household income is $80,000. What moving support could match?"
  );
  assert.equal(extracted.needs_incentive_guidance, true);
  assert.equal(extracted.relocation_stage, "already_moved");
  assert.equal(extracted.profile.age, 28);
  assert.equal(extracted.profile.days_since_move, 30);
  assert.equal(extracted.profile.new_resident, true);
  assert.equal(extracted.profile.income_scope, "household");
  assert.equal(extracted.profile.income_period, "annual");
  assert.equal(extracted.profile.income_basis, "gross");
});
