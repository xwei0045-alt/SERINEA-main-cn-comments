import { COMPARE_PREFERENCE_GROUPS, RANKING_PREFERENCES } from "./types";

/**
 * Compare category hierarchy (Iteration 1 UI correction, used by Compare + AI chips).
 *
 * COMES FROM: CompareClient facility picker / AI preference chips.
 * GOES TO: selected preference ids → GET /api/compare?prefs=…
 *
 * RULE: parent (e.g. School/education) and its children are mutually exclusive.
 * Selecting parent clears children; selecting a child clears the parent.
 * Other groups stay unchanged. School is the parent and must not also appear as a child.
 */

export function preferenceLabel(id: string): string {
  const parent = COMPARE_PREFERENCE_GROUPS.find((group) => group.preferenceId === id);
  if (parent) return parent.label;
  if (id === "primary_school") return "Primary school";
  if (id === "gym") return "Gym or fitness centre";
  return RANKING_PREFERENCES.find((preference) => preference.id === id)?.label ?? id;
}

export function toggleHierarchicalPreference(selected: string[], id: string): string[] {
  const group = COMPARE_PREFERENCE_GROUPS.find((candidate) =>
    candidate.preferenceId === id || candidate.childIds.some((childId) => childId === id)
  );
  if (!group) {
    return selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
  }
  if (selected.includes(id)) return selected.filter((item) => item !== id);
  if (id === group.preferenceId) {
    return [...selected.filter((item) => !group.childIds.some((childId) => childId === item)), id];
  }
  return [...selected.filter((item) => item !== group.preferenceId), id];
}
