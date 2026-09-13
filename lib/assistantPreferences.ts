import { z } from "zod";
import { COMPARE_PREFERENCES } from "./types";

// Reuse the website's allowed preference IDs at both API boundaries.
const ids = COMPARE_PREFERENCES.map((preference) => preference.id);
const preferenceId = z.string().refine((id) => ids.includes(id), "Unknown preference.");
const preferences = z.array(preferenceId).max(ids.length).refine(
  (items) => new Set(items).size === items.length, "Duplicate preferences.",
);

export const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(500),
});

export const assistantPredictionSchema = z.object({
  status: z.enum(["needs_confirmation", "needs_clarification"]),
  include: preferences,
  exclude: preferences,
  conflicts: preferences,
}).strict().refine((value) => {
  // Clarification must never contain actionable model suggestions.
  if (value.status === "needs_clarification") {
    return value.include.length === 0 && value.exclude.length === 0;
  }
  return value.conflicts.length === 0
    && value.include.length + value.exclude.length > 0
    && !value.include.some((id) => value.exclude.includes(id));
}, "Inconsistent prediction.");

export type AssistantPrediction = z.infer<typeof assistantPredictionSchema>;

export function suggestedPreferences(current: string[], prediction: AssistantPrediction): string[] {
  // Preserve unmentioned preferences; return a draft without mutating current state.
  if (prediction.status === "needs_clarification") return [...current];
  return [...new Set([
    ...current.filter((id) => !prediction.exclude.includes(id)),
    ...prediction.include,
  ])];
}

export function preferenceKey(selected: string[]): string {
  // Order does not matter when checking whether confirmed preferences changed.
  return [...selected].sort().join(",");
}
