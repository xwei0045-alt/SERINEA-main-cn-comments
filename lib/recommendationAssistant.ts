import { RANKING_PREFERENCES } from "./types";

/**
 * Mock / structured AI extraction for Iteration 2 (until Xiaotang’s model is final).
 *
 * COMES FROM: AssistantClient user messages (English relocation / lifestyle text).
 * GOES TO:
 *   - preference chips + importance weights → CompareApiClient (GET /api/compare)
 *   - profile + relocationStage + towns → IncentiveApiClient (POST /api/incentives)
 *
 * Field names match the handoff AI JSON contract (intent, profile, preferences,
 * unsupported, needs_incentive_guidance). Occupation stays outside this frozen
 * recommendation shape and is extracted separately for incentive screening.
 */

export const IMPORTANCE_LEVELS = [
  "very_high",
  "high",
  "medium",
  "low",
  "very_low"
] as const;

export type Importance = (typeof IMPORTANCE_LEVELS)[number];

export const IMPORTANCE_WEIGHTS: Record<Importance, number> = {
  very_high: 5,
  high: 4,
  medium: 3,
  low: 2,
  very_low: 1
};

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  very_high: "Top priority",
  high: "Very important",
  medium: "Preferred",
  low: "Nice to have",
  very_low: "Minor bonus"
};

export type RecommendationPreference = {
  target: string;
  importance: Importance;
  evidence: string;
};

export type RecommendationProfile = {
  age: number | null;
  income: number | null;
  income_scope: "individual" | "household" | "unknown";
  income_period: "annual" | "monthly" | "weekly" | "unknown";
  income_basis: "gross" | "net" | "unknown";
  has_child: boolean | null;
  child_ages: number[];
  locality: string | null;
  lga_name: string | null;
  move_distance_km: number | null;
  days_since_move: number | null;
  new_resident: boolean | null;
};

export type RecommendationExtraction = {
  intent: "relocation_recommendation" | "incentive_query" | "other";
  relocation_stage: "planning_to_move" | "already_moved" | "unknown";
  profile: RecommendationProfile;
  preferences: RecommendationPreference[];
  removed_targets: string[];
  unsupported: string[];
  needs_incentive_guidance: boolean;
};

export type RecommendationState = Omit<RecommendationExtraction, "removed_targets">;

type CatalogueEntry = { target: string; aliases: string[] };

const EXTRA_ALIASES: Record<string, string[]> = {
  primary_school: ["primary school", "elementary school"],
  gym: ["gym", "fitness centre", "fitness center"],
  public_transport: ["public transport", "public transit"],
  community: ["community services", "community service"],
  education: ["education services", "education facilities"],
  healthcare: ["health care", "healthcare"],
  recreation: ["recreation facilities", "recreation facility"],
  shopping: ["shopping facilities", "shopping facility"]
};

const CATALOGUE: CatalogueEntry[] = RANKING_PREFERENCES.map((preference) => ({
  target: preference.id,
  aliases: [
    preference.label.toLocaleLowerCase("en-AU"),
    ...(preference.id === "sports_centre"
      ? preference.searchTerms.filter((term) => /sports? centre|sports? center/i.test(term))
      : preference.id === "railway_station"
        ? preference.searchTerms.filter((term) => /station/i.test(term))
        : preference.searchTerms),
    ...(EXTRA_ALIASES[preference.id] ?? [])
  ].filter((value, index, values) => values.indexOf(value) === index)
}));

const UNSUPPORTED = [
  { label: "crime and safety", aliases: ["low crime", "low-crime", "little crime", "safe area", "safe neighbourhood", "safe neighborhood"] },
  { label: "housing affordability", aliases: ["cheap rent", "affordable rent", "affordable housing", "house price", "housing cost"] },
  { label: "internet quality", aliases: ["fast internet", "high-speed internet", "high speed internet", "reliable internet", "broadband speed"] },
  { label: "service frequency", aliases: ["frequent train", "frequent bus", "service frequency"] }
] as const;

const NEGATION = /\b(?:do not|don't|not wanted|no longer need|no longer want|remove|without|exclude)\b/i;
const IMPORTANCE_CUE = /non[- ]negotiable|top priority|critical|must[- ]have|absolutely essential|minor bonus|lowest priority|least important|only if convenient|very low priority|optional|nice to have|would be nice|not essential|if possible|would be useful|strongly prefer|\bprefer\b|\bwant\b|\bneed\b|essential|very important|\bimportant\b/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function allAliasMatches(text: string, alias: string): Array<{ index: number; length: number }> {
  const expression = new RegExp(`\\b${escapeRegExp(alias).replaceAll("\\ ", "\\s+")}\\b`, "gi");
  return [...text.matchAll(expression)].map((match) => ({
    index: match.index,
    length: match[0].length
  }));
}

function sentenceAround(text: string, index: number): string {
  const before = Math.max(text.lastIndexOf(".", index - 1), text.lastIndexOf(";", index - 1));
  const nextDot = text.indexOf(".", index);
  const nextSemi = text.indexOf(";", index);
  const ends = [nextDot, nextSemi].filter((value) => value >= 0);
  const end = ends.length ? Math.min(...ends) : text.length;
  return text.slice(before + 1, end).trim();
}

function clauseAround(text: string, index: number): string {
  const boundary = /[.;,]|\b(?:and|but|plus|actually)\b/gi;
  const before = [...text.slice(0, index).matchAll(boundary)].at(-1);
  const after = boundary.exec(text.slice(index));
  const start = before ? before.index + before[0].length : 0;
  const end = after ? index + after.index : text.length;
  return text.slice(start, end).trim();
}

export function inferImportance(evidence: string): Importance {
  if (/non[- ]negotiable|top priority|critical|must[- ]have|absolutely essential/i.test(evidence)) return "very_high";
  if (/minor bonus|lowest priority|least important|only if convenient|very low priority/i.test(evidence)) return "very_low";
  if (/optional|nice to have|would be nice|not essential|if possible|would be useful/i.test(evidence)) return "low";
  if (/strongly prefer|\bneed\b|essential|very important|\bimportant\b/i.test(evidence)) return "high";
  return "medium";
}

function retrievePreferences(message: string): {
  preferences: RecommendationPreference[];
  removedTargets: string[];
} {
  const candidates: Array<RecommendationPreference & { index: number; length: number; removed: boolean }> = [];

  for (const item of CATALOGUE) {
    const matches = item.aliases.flatMap((alias) =>
      allAliasMatches(message, alias).map((match) => ({ ...match, alias }))
    );
    if (!matches.length) continue;
    const best = matches.sort((first, second) =>
      second.index - first.index || second.length - first.length
    )[0];
    const clause = clauseAround(message, best.index);
    const sentence = sentenceAround(message, best.index);
    const evidence = IMPORTANCE_CUE.test(clause) ? clause : sentence;
    const positiveNotEssential = /\bnot essential\b/i.test(clause);
    candidates.push({
      target: item.target,
      importance: inferImportance(evidence),
      evidence: clause || sentence,
      index: best.index,
      length: best.length,
      removed: NEGATION.test(clause) && !positiveNotEssential
    });
  }

  const filtered = candidates.filter((candidate) =>
    !candidates.some((other) =>
      other.target !== candidate.target &&
      other.index <= candidate.index &&
      other.index + other.length >= candidate.index + candidate.length &&
      other.length > candidate.length
    )
  );

  return {
    preferences: filtered
      .filter((candidate) => !candidate.removed)
      .sort((first, second) => first.index - second.index)
      .map(({ target, importance, evidence }) => ({ target, importance, evidence })),
    removedTargets: filtered.filter((candidate) => candidate.removed).map((candidate) => candidate.target)
  };
}

function parseAmount(raw: string, suffix?: string): number {
  const value = Number(raw.replaceAll(",", ""));
  return suffix?.toLocaleLowerCase("en-AU") === "k" ? value * 1000 : value;
}

function parseProfile(message: string): RecommendationProfile {
  const age = /\b(?:I am|I'm|my age is|I am aged)\s+(\d{1,3})\b/i.exec(message);
  const childAges = [
    ...[...message.matchAll(/\b(\d{1,2})[- ]year[- ]old\s+(?:child|kid|son|daughter)\b/gi)].map((match) => Number(match[1])),
    ...([/\bchildren aged\s+(\d{1,2})\s+and\s+(\d{1,2})\b/i.exec(message)]
      .filter((match): match is RegExpExecArray => Boolean(match))
      .flatMap((match) => [Number(match[1]), Number(match[2])]))
  ];
  const noChildren = /\b(?:no children|no child|no kids|without children|without kids)\b/i.test(message);
  const hasChildMention = /\b(?:child|children|kid|kids|son|daughter)\b/i.test(message);

  const incomeMatches = [...message.matchAll(/\b(?:individual|household|my|our)?\s*income\s+(?:is\s+)?\$?([\d,]+(?:\.\d+)?)\s*(k)?\b/gi)];
  const earningMatches = [...message.matchAll(/\b(?:I|we)\s+(?:earn|make)\s+\$?([\d,]+(?:\.\d+)?)\s*(k)?\b/gi)];
  const correctionMatches = [...message.matchAll(/\bactually\s+\$?([\d,]+(?:\.\d+)?)\s*(k)?\b/gi)];
  const allIncome = [...incomeMatches, ...earningMatches, ...correctionMatches].sort((first, second) => (first.index ?? 0) - (second.index ?? 0));
  const incomeMatch = allIncome.at(-1);
  const income = incomeMatch ? parseAmount(incomeMatch[1], incomeMatch[2]) : null;
  const incomeScope = /\b(?:our\s+)?household income\b/i.test(message)
    ? "household"
    : /\b(?:my\s+)?individual income\b|\bmy\b.{0,24}\bincome\b|\bI\s+(?:earn|make)\b/i.test(message)
      ? "individual"
      : "unknown";
  const incomePeriod = /\b(?:annual|annually|yearly|per year)\b/i.test(message)
    ? "annual"
    : /\b(?:monthly|per month)\b/i.test(message)
      ? "monthly"
      : /\b(?:weekly|per week|each week)\b/i.test(message)
        ? "weekly"
        : "unknown";
  const uncertainBasis = /\b(?:do not know|don't know|unsure|not sure|whether)\b.{0,45}\b(?:gross|net|before|after)\b/i.test(message);
  const incomeBasis = uncertainBasis
    ? "unknown"
    : /\b(?:before tax|pre-tax|gross)\b/i.test(message)
      ? "gross"
      : /\b(?:after tax|post-tax|net)\b/i.test(message)
        ? "net"
        : "unknown";
  const distance = /\b(?:moved|move|relocated|relocate)\s+(\d+(?:\.\d+)?)\s*(?:km|kilomet(?:er|re)s?)\b/i.exec(message);
  const days = /\b(\d+)\s+days?\s+ago\b/i.exec(message);
  const explicitlyNotNew = /\b(?:not a new resident|not new residents?|no longer a new resident)\b/i.test(message);
  const explicitlyNew = /\b(?:I am|I'm|we are|we're)\s+(?:now\s+)?(?:a\s+)?new residents?\b|\bnew resident (?:in|of)\b/i.test(message);

  return {
    age: age ? Number(age[1]) : null,
    income,
    income_scope: incomeScope,
    income_period: incomePeriod,
    income_basis: incomeBasis,
    has_child: noChildren ? false : hasChildMention ? true : null,
    child_ages: [...new Set(childAges)],
    locality: null,
    lga_name: null,
    move_distance_km: distance ? Number(distance[1]) : null,
    days_since_move: days ? Number(days[1]) : null,
    new_resident: explicitlyNotNew ? false : explicitlyNew ? true : null
  };
}

/** Extracts only an explicitly labelled occupation for incentive screening. */
export function extractOccupation(message: string): string | null {
  const match = /\b(?:occupation|job)\s*(?:is|:)?\s*([a-z][a-z .'-]{1,80})(?=[,.;]|$)/i.exec(message)
    ?? /\bI\s+work\s+as\s+(?:an?\s+)?([a-z][a-z .'-]{1,80})(?=[,.;]|$)/i.exec(message);
  return match?.[1]?.trim() ?? null;
}

function relocationStage(message: string): RecommendationExtraction["relocation_stage"] {
  if (/\b(?:already|recently)\s+(?:moved|relocated)\b|\b(?:moved|relocated)\s+recently\b|\b(?:moved|relocated)\b.{0,30}\bago\b|\brelocation is complete\b|\bfinished moving\b/i.test(message)) {
    return "already_moved";
  }
  if (/\b(?:plan|planning|intend|intending|considering|expect|looking|may)\b.{0,35}\b(?:move|relocate|relocation)\b/i.test(message)) {
    return "planning_to_move";
  }
  return "unknown";
}

export function extractRecommendation(message: string): RecommendationExtraction {
  const retrieved = retrievePreferences(message);
  const unsupported = UNSUPPORTED
    .filter((item) => item.aliases.some((alias) => allAliasMatches(message, alias).length > 0))
    .map((item) => item.label);
  const stage = relocationStage(message);
  const needsIncentives = /\b(?:grant|grants|incentive|incentives|subsidy|subsidies|polic(?:y|ies)|benefit|benefits|rebate|rebates|voucher|vouchers|financial assistance|financial help|funding support|moving support)\b/i.test(message);
  const hasRelocationRequest = stage !== "unknown" || retrieved.preferences.length > 0 || unsupported.length > 0;

  return {
    intent: hasRelocationRequest
      ? "relocation_recommendation"
      : needsIncentives ? "incentive_query" : "other",
    relocation_stage: stage,
    profile: parseProfile(message),
    preferences: retrieved.preferences,
    removed_targets: retrieved.removedTargets,
    unsupported,
    needs_incentive_guidance: needsIncentives
  };
}

export function emptyRecommendationState(): RecommendationState {
  return {
    intent: "other",
    relocation_stage: "unknown",
    profile: parseProfile(""),
    preferences: [],
    unsupported: [],
    needs_incentive_guidance: false
  };
}

export function mergeRecommendationState(
  current: RecommendationState,
  next: RecommendationExtraction
): RecommendationState {
  const preferences = new Map(current.preferences.map((item) => [item.target, item]));
  for (const target of next.removed_targets) preferences.delete(target);
  for (const preference of next.preferences) preferences.set(preference.target, preference);

  const replaceWithOnly = /\bonly\s+(?:count|need|want|care about|include)\b/i.test(
    next.preferences.map((item) => item.evidence).join(" ")
  );
  const mergedProfile = { ...current.profile };
  for (const [key, value] of Object.entries(next.profile) as Array<
    [keyof RecommendationProfile, RecommendationProfile[keyof RecommendationProfile]]
  >) {
    if (value !== null && value !== "unknown" && (!Array.isArray(value) || value.length > 0)) {
      (mergedProfile as Record<keyof RecommendationProfile, unknown>)[key] = value;
    }
  }

  return {
    intent: next.intent === "other" ? current.intent : next.intent,
    relocation_stage: next.relocation_stage === "unknown" ? current.relocation_stage : next.relocation_stage,
    profile: mergedProfile,
    preferences: replaceWithOnly ? next.preferences : [...preferences.values()],
    unsupported: next.unsupported.length ? next.unsupported : current.unsupported,
    needs_incentive_guidance: current.needs_incentive_guidance || next.needs_incentive_guidance
  };
}

export function weightsForPreferences(preferences: RecommendationPreference[]): number[] {
  return preferences.map((preference) => IMPORTANCE_WEIGHTS[preference.importance]);
}

export function preferenceLabel(target: string): string {
  return RANKING_PREFERENCES.find((item) => item.id === target)?.label ?? target.replaceAll("_", " ");
}
