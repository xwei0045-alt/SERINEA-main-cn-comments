import { LocalitySummaryServiceFactory } from "@/backend/factories/LocalitySummaryServiceFactory";
import test from "node:test";
import assert from "node:assert/strict";
import { buildRecommendations, findTownNames } from "./ChatRecommendationService";
import { CompareService } from "./CompareService";
import { LocalitySummaryService } from "./LocalitySummaryService";
import { chatRequestSchema, planSchema, preferenceIds, preferenceNames } from "@/lib/chatRecommendations";
import { POST } from "@/app/api/chat/route";

const family = { priority: false, intent: "recommend" as const, town: "", include: ["school", "supermarket"], bonus: [], exclude: [], area: "", unverified: [] };

test("request validation rejects bad history and unsupported categories", () => {
  assert.deepEqual(Object.keys(preferenceNames).sort(), [...preferenceIds].sort());
  assert.equal(chatRequestSchema.safeParse({ messages: [] }).success, false);
  assert.equal(chatRequestSchema.safeParse({ messages: [{ role: "user", content: " " }] }).success, false);
  assert.equal(chatRequestSchema.safeParse({ messages: [{ role: "user", content: "x".repeat(2001) }] }).success, false);
  assert.equal(chatRequestSchema.safeParse({ messages: [{ role: "assistant", content: "hello" }] }).success, false);
  assert.equal(planSchema.safeParse({ ...family, include: ["school_quality"] }).success, false);
  assert.equal(chatRequestSchema.safeParse({ messages: [
    { role: "user", content: "schools" }, { role: "assistant", content: "Noted" },
    { role: "user", content: "groceries too" },
  ] }).success, true);
});

test("real CSV recommendations match Compare ranking, with source and limits", async () => {
  const localities = new LocalitySummaryService();
  const reply = await buildRecommendations(family, localities);
  const expected = await new CompareService(localities).rank({ prefs: family.include, limit: 3, q: "" });
  const title = (value: string) => value.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
  assert.deepEqual(reply.places.map(place => place.name), expected.items.map(row => title(row.locality)));
  assert.deepEqual(reply.preferences, family.include);
  assert.match(reply.reply, /School/);
  assert.match(reply.reply, /snack range/);
  assert.match(reply.reply, /not scored/);
  assert.doesNotMatch(reply.reply, /\p{Script=Han}/u);
  assert.match(reply.reply, /locality_poi_summary_iteration1.csv/);
  for (const row of expected.items) {
    const format = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 });
    assert.ok(reply.reply.includes(`Score ${format.format(row.score)}`));
  }
  console.log("Real CSV example:\n" + reply.reply);
});

test("clarification, no match, explicit bonus, conflicts and long replies stay safe", async () => {
  const localities = new LocalitySummaryService();
  const noPreferences = await buildRecommendations({ ...family, include: [] }, localities);
  assert.equal(noPreferences.places.length, 0);
  const noTown = await buildRecommendations({ ...family, area: "__no_such_town__" }, localities);
  assert.equal(noTown.places.length, 0);
  assert.deepEqual(noTown.preferences, []);
  await assert.rejects(buildRecommendations({ ...family, exclude: ["school"] }, localities));
  const withBonus = await buildRecommendations({ ...family, bonus: ["park"] }, localities);
  const withoutBonus = await buildRecommendations(family, localities);
  assert.deepEqual(withBonus.places, withoutBonus.places);
  const long = await buildRecommendations({ ...family, include: preferenceIds,
    unverified: ["x".repeat(80), "y".repeat(80), "z".repeat(80)] }, localities);
  assert.ok(long.reply.length <= 4000);
});

test("town spelling correction is general and does not choose between tied candidates", () => {
  const names = ["Mildura", "Shepparton", "Wangaratta", "Wodonga"];
  for (const [typed, expected] of [["Midura", "Mildura"], ["Mildrua", "Mildura"],
    ["Sheparton", "Shepparton"], ["Wangarata", "Wangaratta"], ["Wodnga", "Wodonga"]]) {
    assert.deepEqual(findTownNames(typed, names), [expected]);
  }
  assert.deepEqual(findTownNames("SHEPPARTON", names), ["Shepparton"]);
  assert.deepEqual(findTownNames("abcd", ["abce", "abcf"]), ["abce", "abcf"]);
  assert.deepEqual(findTownNames("abce", ["abce", "abcf"]), ["abce"]);
  assert.deepEqual(findTownNames("unlistedtown", names), []);
  assert.deepEqual(findTownNames("", names), []);
});

test("town details answer the named town without a new shortlist or preference update", async () => {
  const localities = new LocalitySummaryService();
  for (const [typed, expected] of [["Midura", "Mildura"], ["Sheparton", "Shepparton"],
    ["Wangarata", "Wangaratta"], ["Wodnga", "Wodonga"]]) {
    const reply = await buildRecommendations({ ...family, intent: "town_details", town: typed }, localities);
    assert.equal(reply.places.length, 1);
    assert.equal(reply.places[0].name, expected);
    assert.deepEqual(reply.preferences, []);
    assert.match(reply.reply, /town overview/);
    assert.match(reply.reply, /I think you mean/);
    assert.doesNotMatch(reply.reply, /Inspect first:|— Score|\p{Script=Han}/u);
  }
  const noPreferences = await buildRecommendations({ ...family, intent: "town_details", town: "Mildura", include: [] }, localities);
  assert.equal(noPreferences.places[0].name, "Mildura");
  const noTown = await buildRecommendations({ ...family, intent: "town_details", town: "unlistedtown" }, localities);
  assert.equal(noTown.places.length, 0);
  assert.match(noTown.reply, /could not identify/);
});

test("API connects extraction to data; handles failures without inventing a fallback", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  const originalModel = process.env.GROQ_MODEL;
  process.env.GROQ_API_KEY = "local-test-placeholder";
  process.env.GROQ_MODEL = "openai/gpt-oss-20b";
  let calls = 0;
  let mode = "family";
  const request = (messages = [{ role: "user", content: "My child goes to primary school and enjoys snacks. Which towns would you recommend?" }]) =>
    new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify({ messages }) });
  try {
    // Use the CSV fixture for this offline provider test.
    t.mock.method(LocalitySummaryServiceFactory, "create", () => new LocalitySummaryService());
    globalThis.fetch = async (url, init) => {
      calls++;
      assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
      const sent = JSON.parse(String(init?.body));
      if (sent.messages[0].content.startsWith("Explain this authoritative")) {
        if (mode === "explanation-network") throw new Error("offline");
        const evidence = JSON.parse(sent.messages[0].content.split("Evidence: ")[1].split(". Ranking:")[0]);
        return Response.json({ choices: [{ message: { content: JSON.stringify({ sentences:
          mode === "hallucination" ? ["Atlantis is safest and cheapest."] : [evidence[0]] }) }, finish_reason: "stop" }] });
      }
      assert.equal(sent.response_format.json_schema.strict, true);
      assert.equal(sent.messages[0].role, "system");
      assert.match(sent.messages[0].content, /Write all free-text plan fields in English/);
      assert.doesNotMatch(sent.messages[0].content, /\p{Script=Han}/u);
      if (mode === "429") return new Response("{}", { status: 429 });
      if (mode === "network") throw new Error("offline");
      const plan = mode === "correction" ? { ...family, include: ["supermarket"], exclude: ["school"] }
        : mode === "details" ? { ...family, intent: "town_details", town: "Sheparton" }
        : mode === "invalid" ? { ...family, include: ["housing_price"] }
        : mode === "conflict" ? { ...family, exclude: ["school"] } : family;
      return Response.json({ choices: [{ message: { content: JSON.stringify(plan) }, finish_reason: "stop" }] });
    };
    const bad = await POST(request([]));
    assert.equal(bad.status, 400);
    assert.equal(calls, 0);
    const first = await POST(request());
    assert.equal(first.status, 200);
    const answer = await first.json();
    assert.equal(answer.places.length, 3);
    assert.deepEqual(answer.preferences, ["school", "supermarket"]);
    assert.match(answer.reply, /Why this ranking:/);
    for (const failure of ["explanation-network", "hallucination"]) {
      mode = failure;
      const fallback = await POST(request());
      assert.equal(fallback.status, 200);
      const safe = await fallback.json();
      assert.deepEqual(safe.places, answer.places);
      assert.doesNotMatch(safe.reply, /Atlantis|Why this ranking:/);
    }
    mode = "correction";
    const next = await POST(request([
      { role: "user", content: "Schools and supermarkets" }, { role: "assistant", content: answer.reply },
      { role: "user", content: "Schools no longer matter. Only count supermarkets." },
    ]));
    assert.deepEqual((await next.json()).preferences, ["supermarket"]);
    mode = "details";
    const details = await POST(request([
      { role: "user", content: "Schools and supermarkets" }, { role: "assistant", content: answer.reply },
      { role: "user", content: "What is Sheparton like?" },
    ]));
    const overview = await details.json();
    assert.equal(details.status, 200);
    assert.equal(overview.places.length, 1);
    assert.equal(overview.places[0].name, "Shepparton");
    assert.deepEqual(overview.preferences, []);
    for (const [scenario, status] of [["429", 429], ["network", 502], ["invalid", 502], ["conflict", 502]] as const) {
      mode = scenario;
      const response = await POST(request());
      assert.equal(response.status, status);
      assert.ok((await response.json()).error);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GROQ_MODEL; else process.env.GROQ_MODEL = originalModel;
  }
});


test("education dataset, priority order, area and all categories agree with Compare", async () => {
  for (const include of [["school", "kindergarten", "college"], ["park", "supermarket"], preferenceIds]) {
    for (const priority of [false, true]) {
      const plan = { ...family, include, priority, area: "" };
      const localities = new LocalitySummaryService();
      const reply = await buildRecommendations(plan, localities);
      const { preferenceWeights } = await import("@/lib/comparePriorities");
      const expected = await new CompareService(localities).rank({ prefs: include,
        weights: preferenceWeights(include.length, priority), q: plan.area, limit: 3 });
      assert.deepEqual(reply.places.map(p => p.name.toUpperCase()), expected.items.map(p => p.locality.toUpperCase()));
      assert.deepEqual(reply.preferences, include);
      assert.equal(reply.priority, priority);
      const format = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 });
      for (const item of expected.items) assert.ok(reply.reply.includes(`Score ${format.format(item.score)}`));
      assert.doesNotMatch(reply.reply, /undefined|Education \(mixed category\)/);
    }
  }
  assert.equal(planSchema.safeParse({ ...family, include: ["school", "school"] }).success, false);
  assert.equal(chatRequestSchema.safeParse({ messages: [{ role: "user", content: "recommend" }],
    context: { preferences: ["fake"], priority: true, area: "" } }).success, false);
});
