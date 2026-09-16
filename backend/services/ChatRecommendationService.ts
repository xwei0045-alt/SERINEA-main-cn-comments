import { LocalitySummaryServiceFactory } from "@/backend/factories/LocalitySummaryServiceFactory";
import { CompareServiceFactory } from "@/backend/factories/CompareServiceFactory";
import { preferenceWeights } from "@/lib/comparePriorities";
import type { CompareResponse } from "@/shared/contracts/compare";
import { CompareService } from "./CompareService";
import { LocalitySummaryService } from "./LocalitySummaryService";
import { chatReplySchema, planSchema, preferenceIds, preferenceNames } from "@/lib/chatRecommendations";
import type { RecommendationPlan } from "@/lib/chatRecommendations";

const sourceLabel = (source: CompareResponse["dataSource"]) => source === "database"
  ? "AWS RDS: public.regional_pois" : "locality_poi_summary_iteration1.csv (current CSV snapshot, not live)";
const scoreFormat = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 });
const title = (value: string) => value.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
const key = (row: { locality: string; lgaName: string; regionalGroup: string }) =>
  JSON.stringify([row.locality, row.lgaName, row.regionalGroup]);

const normaliseTown = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Match minor spelling errors against real names, retaining tied candidates.
export function findTownNames(query: string, names: string[]): string[] {
  const input = normaliseTown(query);
  if (!input) return [];
  const unique = [...new Set(names)];
  const exact = unique.filter(name => normaliseTown(name) === input);
  if (exact.length) return exact;
  const limit = input.length >= 8 ? 2 : input.length >= 4 ? 1 : 0;
  let best = limit + 1;
  let result: string[] = [];
  for (const name of unique) {
    const target = normaliseTown(name);
    if (Math.abs(input.length - target.length) > limit) continue;
    const distance = Array.from({ length: input.length + 1 }, (_, i) =>
      Array.from({ length: target.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
    for (let i = 1; i <= input.length; i++) {
      for (let j = 1; j <= target.length; j++) {
        distance[i][j] = Math.min(distance[i - 1][j] + 1, distance[i][j - 1] + 1,
          distance[i - 1][j - 1] + (input[i - 1] === target[j - 1] ? 0 : 1));
        // An adjacent letter swap counts as one typo.
        if (i > 1 && j > 1 && input[i - 1] === target[j - 2] && input[i - 2] === target[j - 1]) {
          distance[i][j] = Math.min(distance[i][j], distance[i - 2][j - 2] + 1);
        }
      }
    }
    const edits = distance[input.length][target.length];
    if (edits > limit || edits > best) continue;
    if (edits < best) { best = edits; result = []; }
    result.push(name);
  }
  return result;
}

async function townDetails(
  plan: RecommendationPlan,
  localities: LocalitySummaryService,
  compare: CompareService
) {
  const catalog = await localities.listAll();
  // Require a real, unique locality. Never silently substitute a different town.
  const names = findTownNames(plan.town, catalog.items.map(item => item.locality));
  let matches = catalog.items.filter(item => names.includes(item.locality));
  if (matches.length > 1 && plan.area) {
    const scoped = matches.filter(item => [item.lgaName, item.regionalGroup].some(value =>
      value.toLowerCase().includes(plan.area.toLowerCase())));
    if (scoped.length) matches = scoped;
  }
  if (matches.length !== 1) return chatReplySchema.parse({
    reply: matches.length > 1
      ? `Did you mean ${matches.slice(0, 3).map(item => `${title(item.locality)} (${title(item.lgaName)})`).join(" or ")}? Please confirm the town and local government area before I continue.`
      : `I could not identify a unique town named "${plan.town}" in the dataset. Please use a town name from the shortlist.`,
    preferences: [], priority: plan.priority, area: plan.area, places: [],
  });
  const town = matches[0];
  const all = await compare.rank({ prefs: preferenceIds, q: "", limit: catalog.items.length });
  const row = all.items.find(item => key(item) === key(town));
  const counts = row?.breakdown ?? preferenceIds.map(preferenceId => ({ preferenceId, count: 0 }));
  const relevant = counts.filter(item => plan.include.includes(item.preferenceId));
  const strengths = (relevant.length ? relevant : counts.filter(item => !plan.exclude.includes(item.preferenceId)))
    .filter(item => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
  const gaps = relevant.filter(item => item.count === 0).map(item => preferenceNames[item.preferenceId]);
  const lines = [
    `${title(town.locality)} — town overview`,
    `Location: ${title(town.lgaName)} local government area, ${title(town.regionalGroup)} region.`,
    `The current dataset contains ${town.totalPoiCount} POI records for this locality.`,
    "\nRecorded services:",
    ...counts.map(item => `- ${preferenceNames[item.preferenceId]}: ${item.count}`),
    `\nPotential advantages${relevant.length ? " for your current needs" : " to investigate"}:`,
    ...strengths.map(item => `- ${preferenceNames[item.preferenceId]}: ${item.count}. Potential use: locations to investigate for this service.`),
  ];
  if (normaliseTown(plan.town) !== normaliseTown(town.locality)) {
    lines.unshift(`I think you mean ${title(town.locality)} by "${plan.town}". The overview below uses that town; please correct me if you meant somewhere else.\n`);
  }
  if (!strengths.length) lines.push("The available records do not establish an advantage for your stated needs.");
  if (gaps.length) lines.push(`Record gaps: ${gaps.join(", ")}. Missing records do not prove that these facilities do not exist.`);
  const extras = counts.filter(item => !plan.include.includes(item.preferenceId) && !plan.exclude.includes(item.preferenceId)
    && (plan.bonus.length ? plan.bonus.includes(item.preferenceId) : item.count > 0))
    .sort((a, b) => b.count - a.count).slice(0, 2);
  if (relevant.length && extras.length) lines.push(`\nOther options, if they matter to you: ${extras.map(item => `${preferenceNames[item.preferenceId]} ${item.count}`).join("; ")}. These are not added to your preferences.`);
  lines.push("\nLimits: these are town-wide records, not proof of nearby access or service quality. Education categories are separate; school level and catchments are unverified. Grocery records do not verify snack products. Transport records may describe parts of the same stop and do not establish timetables or reliability. Housing costs, safety and employment are not covered.");
  if (plan.unverified.length) lines.push(`Unverified requirements: ${plan.unverified.join("; ")}.`);
  lines.push(`Source: ${sourceLabel(all.dataSource)}. This is a town overview, not a new shortlist. Your filters have not changed.`);
  // Details are read-only: offer a map link, not a button that changes preferences.
  return chatReplySchema.parse({ reply: lines.join("\n"), preferences: [], priority: plan.priority, area: plan.area,
    places: [{ name: title(town.locality), latitude: town.latitude, longitude: town.longitude }] });
}

// Facts and explanations come from application data, not generated numbers.
// Build the user-facing recommendation text from the confirmed plan.
export async function buildRecommendations(input: RecommendationPlan,
  localities?: LocalitySummaryService,
  explain?: (result: CompareResponse) => Promise<string>,
  compare?: CompareService) {
  const localityService = localities ?? LocalitySummaryServiceFactory.create();
  // Production uses the same fully wired Compare service as /api/compare.
  // Tests that inject a locality service stay isolated unless they inject Compare too.
  const compareService = compare ?? (localities
    ? new CompareService(localityService)
    : CompareServiceFactory.create());
  const plan = planSchema.parse(input);
  const name = (id: string) => preferenceNames[id];
  const include = [...new Set(plan.include)];
  const bonus = [...new Set(plan.bonus)];
  if (include.some(id => bonus.includes(id) || plan.exclude.includes(id)) ||
    bonus.some(id => plan.exclude.includes(id))) {
    throw new Error("Conflicting extracted preferences.");
  }

  // Answer a named-town question before considering a new recommendation.
  if (plan.intent === "town_details") return townDetails(plan, localityService, compareService);

  if (!include.length) {
    return chatReplySchema.parse({
      reply: "Which facilities matter most: education, grocery stores, medical services, parks or transport stops? The current counts cannot verify housing costs, school quality, safety or timetables.",
      preferences: [], priority: plan.priority, area: plan.area, places: [],
    });
  }

  // Use exactly the same ranking algorithm and area filter as /api/compare.
  const result = await compareService.rank({ prefs: include, weights: preferenceWeights(include.length, plan.priority), q: plan.area, limit: 3 });
  if (!result.items.length) {
    return chatReplySchema.parse({
      reply: `No dataset matches for these preferences${plan.area ? ` in "${plan.area}"` : ""}. Try a supported regional Victorian town or different facilities. Missing records do not prove that a facility does not exist.`,
      preferences: [], priority: plan.priority, area: plan.area, places: [],
    });
  }

  // A second local lookup supplies optional facilities; it does not change the score.
  const catalog = await localityService.listAll();
  const all = await compareService.rank({ prefs: preferenceIds, q: plan.area, limit: catalog.items.length });
  const extrasByTown = new Map(all.items.map(row => [key(row), row.breakdown]));
  const selectedNames = include.slice(0, 8).map(name).join(", ") + (include.length > 8 ? ` and ${include.length - 8} more` : "");
  const lines = [`Shortlist for ${selectedNames}${plan.area ? `, within ${plan.area}` : " in regional Victoria"}. Preferences are in ${plan.priority ? "priority order (highest first)" : "equal-weight order"}. The composite score uses explicit needs (75%), overall POI coverage (15%), and SAL/LGA profile evidence (10%).`];

  const visibleExtras = new Set<string>();
  for (const [index, row] of result.items.entries()) {
    const counts = row.breakdown.slice(0, 8).map(item => `${name(item.preferenceId)} ${item.count}`).join("; ");
    const leaders = row.breakdown.filter(item => item.count > 0 && item.count === Math.max(
      ...result.items.map(other => other.breakdown.find(b => b.preferenceId === item.preferenceId)?.count ?? 0)
    )).slice(0, 3).map(item => name(item.preferenceId));
    const missing = row.breakdown.filter(item => item.count === 0).slice(0, 3).map(item => name(item.preferenceId));
    const optional = (extrasByTown.get(key(row)) ?? []).filter(item =>
      !include.includes(item.preferenceId) && !plan.exclude.includes(item.preferenceId) &&
      (bonus.length ? bonus.includes(item.preferenceId) : item.count > 0)
    ).sort((a, b) => b.count - a.count).slice(0, 2);
    optional.forEach(item => visibleExtras.add(item.preferenceId));
    lines.push(`\n${index + 1}. ${title(row.locality)} (${title(row.lgaName)}) — Score ${scoreFormat.format(row.score)}`);
    lines.push(`Records${row.breakdown.length > 8 ? " (first 8 preferences; all are scored)" : ""}: ${counts}`);
    lines.push(`Relative strength: ${leaders.length ? `Highest or joint-highest counts here for ${leaders.join(", ")}.` : "Shortlisted by the current count score; no single category leads this shortlist."}`);
    if (missing.length) lines.push(`Gap: no records for ${missing.join(", ")}; that need is not verified.`);
    if (optional.length) lines.push(`Optional extras (not scored): if these matter too, records show ${optional.map(item => `${name(item.preferenceId)} ${item.count}`).join("; ")}.`);
  }

  const top = result.items[0];
  const tied = result.items[1]?.score === top.score;
  lines.push(`\nInspect first: ${title(top.locality)}. ${tied ? "The composite score is tied; the website breaks ties by total records and name, not personal suitability." : "It leads the current 75/15/10 composite score, so it is a starting point, not proof of the best overall fit."}`);
  const cautions = ["The user-needs component normalises each selected category against its highest count in the search area. Missing categories and missing profiles earn zero for their component; first place is not automatically 100. Scores do not measure service quality or personal suitability. Zero records do not prove absence. Address-level distance, hours and quality are unverified."];
  if (include.includes("school")) cautions.push("School records do not establish school level, quality, enrolment or catchments.");
  if (include.some(id => ["supermarket", "convenience_store"].includes(id))) cautions.push("Grocery records are supermarkets/convenience stores; snack range, prices and shop quality are unknown.");
  if ([...include, ...visibleExtras].some(id => /^(bus_|railway_|tram_|platform$|station$|stop_position$)/.test(id))) cautions.push("Transit records are not necessarily distinct stops; frequency, commute time and reliability are unknown.");
  if (plan.unverified.length) cautions.push(`Unverified requirements: ${plan.unverified.join("; ")}.`);
  lines.push(`\nLimits: ${cautions.join(" ")}`);
  lines.push(`Source: ${sourceLabel(result.dataSource)}. Tell me which preferences to add or remove.`);

  if (explain) {
    // Provider failure leaves the authoritative, locally formatted answer intact.
    try { lines.push(`\nWhy this ranking: ${await explain(result)}`); } catch { /* Local evidence remains available. */ }
  }
  return chatReplySchema.parse({ reply: lines.join("\n"), preferences: include, priority: plan.priority, area: plan.area,
    places: result.items.map(row => ({ name: title(row.locality), latitude: row.latitude, longitude: row.longitude })) });
}
