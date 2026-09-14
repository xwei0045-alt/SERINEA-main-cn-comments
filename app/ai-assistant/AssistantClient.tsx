"use client";

/**
 * Iteration 2 AI Recommendation UI (/ai-assistant).
 *
 * DATA FLOW (easy map of this file)
 * 1. User types a relocation/lifestyle message (or taps an example).
 * 2. extractRecommendation() in lib/recommendationAssistant.ts turns text into
 *    structured preferences + profile (mock/structured AI JSON shape from handoff).
 * 3. If there is at least one supported lifestyle preference →
 *    compareApiClient.rank() → GET /api/compare → CompareService.rank (same ranking as Compare).
 * 4. If needs_incentive_guidance →
 *    incentiveApiClient.find() → POST /api/incentives → IncentiveService.
 * 5. Town cards render lifestyle rank + a separate mock-incentive block (never one combined %).
 * 6. Keep/Remove updates chosenTowns; "Compare on map" links to /map with retained towns.
 *
 * COMES FROM: Chrome → /ai-assistant
 * GOES TO: /api/compare, /api/incentives, then optionally /map?town=…
 */

import Link from "next/link";
import { useRef, useState } from "react";
import { Chrome } from "../components/Chrome";
import { compareApiClient } from "@/frontend/api/CompareApiClient";
import { incentiveApiClient } from "@/frontend/api/IncentiveApiClient";
import {
  emptyRecommendationState,
  extractRecommendation,
  IMPORTANCE_LABELS,
  IMPORTANCE_LEVELS,
  mergeRecommendationState,
  preferenceLabel,
  weightsForPreferences,
  type Importance,
  type RecommendationState
} from "@/lib/recommendationAssistant";
import { RANKING_PREFERENCES } from "@/lib/types";
import type { CompareRankItem, CompareResponse } from "@/shared/contracts/compare";
import type {
  IncentiveResponse,
  IncentiveResultItem,
  IncentiveTownGroup
} from "@/shared/contracts/incentives";
import styles from "./assistant.module.css";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  result?: CompareResponse;
  incentives?: IncentiveResponse;
};

const examples = [
  "We plan to move. A primary school is essential and a pharmacy would be nice.",
  "I need a park and a library. A gym is only a minor bonus.",
  "I am 28 and recently moved 60 km to Lucas 30 days ago. I am a new resident. My annual gross household income is $80,000. What moving support could match?"
] as const;

function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("en-AU")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function evidenceReply(
  state: RecommendationState,
  result?: CompareResponse,
  incentives?: IncentiveResponse
): string {
  const names = state.preferences.map((item) => preferenceLabel(item.target)).join(", ");
  const opening = result
    ? `I used your confirmed lifestyle preferences (${names}) to rank about five towns from the current POI records.`
    : incentives?.needsAreaOrLifestyle
      ? "Tell me a town to inspect, or add at least one lifestyle preference so I can rank towns first."
      : "I screened the named area's mock incentive records against the facts you provided.";
  const unsupported = state.unsupported.length
    ? ` I could not verify ${state.unsupported.join(", ")}; these were left out of the ranking.`
    : "";
  const incentiveCount = incentives?.groups.reduce((total, group) => total + group.items.length, 0) ?? 0;
  const incentiveText = incentives
    ? incentiveCount > 0
      ? ` I found ${incentiveCount} non-closed mock incentive record${incentiveCount === 1 ? "" : "s"}. These are shown separately and did not change the lifestyle order.`
      : " No non-closed mock incentive record passed the known-condition checks for this request."
    : "";
  const availability = result?.items.length
    ? " Select the towns you want to keep, open them on the map, or send another message to correct a fact or preference."
    : "";
  return `${opening}${unsupported}${incentiveText}${availability}`;
}

export default function AssistantClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [profile, setProfile] = useState<RecommendationState>(emptyRecommendationState);
  const [latestResult, setLatestResult] = useState<CompareResponse | null>(null);
  const [latestIncentives, setLatestIncentives] = useState<IncentiveResponse | null>(null);
  const [chosenTowns, setChosenTowns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [useTiny, setUseTiny] = useState(false);
  const [tinyStatus, setTinyStatus] = useState("Cloud AI review is off.");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextMessageId = useRef(1);

  async function rank(state: RecommendationState): Promise<CompareResponse> {
    return compareApiClient.rank({
      prefs: state.preferences.map((item) => item.target),
      weights: weightsForPreferences(state.preferences),
      limit: 5
    });
  }

  async function findIncentives(
    state: RecommendationState,
    message: string,
    result?: CompareResponse
  ): Promise<IncentiveResponse> {
    return incentiveApiClient.find({
      message,
      relocationStage: state.relocation_stage,
      profile: state.profile,
      towns: result?.items.map((item) => ({ locality: item.locality, lgaName: item.lgaName })) ?? [],
      limitPerTown: 3
    });
  }

  async function send(text: string) {
    const value = text.trim();
    if (!value || loading) return;

    const userMessage: Message = { id: nextMessageId.current++, role: "user", text: value };
    const extraction = extractRecommendation(value);
    let nextProfile = mergeRecommendationState(profile, extraction);
    setMessages((current) => [...current, userMessage]);
    setProfile(nextProfile);
    setDraft("");
    setLoading(true);

    if (useTiny) {
      setTinyStatus("Cloud Qwen review is checking the extraction…");
      try {
      const response = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value })
      });
      if (!response.ok) throw new Error("Review request failed.");
      const review = await response.json() as { summary: string; preferences?: Array<{ target: string; importance: Importance }>; unsupported?: string[]; source?: string };
      setTinyStatus(review.summary);
      if (review.source !== "fallback" && review.preferences) {
        const supportedTargets = new Set(RANKING_PREFERENCES.map((item) => item.id));
        const aiPreferences = review.preferences
          .filter((item) => supportedTargets.has(item.target))
          .map((item) => ({ ...item, evidence: "Understood by Cloud Qwen" }));
        nextProfile = { ...nextProfile, preferences: aiPreferences, unsupported: review.unsupported ?? nextProfile.unsupported };
        setProfile(nextProfile);
      }
      } catch { setTinyStatus("Cloud Qwen review was unavailable. Deterministic extraction remained active."); }
    }

    try {
      const result = nextProfile.preferences.length > 0 ? await rank(nextProfile) : undefined;
      const incentives = nextProfile.needs_incentive_guidance
        ? await findIncentives(nextProfile, value, result)
        : undefined;

      if (!result && !incentives) {
        const unsupported = nextProfile.unsupported.length
          ? `I found ${nextProfile.unsupported.join(", ")}, but the current datasets cannot verify those requirements. `
          : "";
        setMessages((current) => [...current, {
          id: nextMessageId.current++,
          role: "assistant",
          text: `${unsupported}Tell me at least one supported town facility, such as a park, library, pharmacy, supermarket, school or bus stop.`
        }]);
        return;
      }

      if (result) {
        setLatestResult(result);
        setChosenTowns(result.items.map((item) => `${item.locality}\u0000${item.lgaName}`));
      }
      if (incentives) {
        setLatestIncentives(incentives);
        if (incentives.queryArea && !nextProfile.profile.locality) {
          setProfile((current) => ({
            ...current,
            profile: { ...current.profile, locality: incentives.queryArea }
          }));
        }
      }
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          role: "assistant",
          text: evidenceReply(nextProfile, result, incentives),
          result,
          incentives
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          role: "assistant",
          text: error instanceof Error
            ? `I understood the request, but the structured data could not be read: ${error.message}`
            : "I understood the request, but the structured data could not be read."
        }
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function applyEditedPreferences() {
    if (!profile.preferences.length || loading) return;
    setLoading(true);
    try {
      const result = await rank(profile);
      const incentives = profile.needs_incentive_guidance
        ? await findIncentives(profile, "", result)
        : undefined;
      setLatestResult(result);
      if (incentives) setLatestIncentives(incentives);
      setChosenTowns(result.items.map((item) => `${item.locality}\u0000${item.lgaName}`));
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          role: "assistant",
          text: evidenceReply(profile, result, incentives),
          result,
          incentives
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId.current++,
          role: "assistant",
          text: error instanceof Error ? error.message : "Town ranking is unavailable."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function updateImportance(target: string, importance: Importance) {
    setProfile((current) => ({
      ...current,
      preferences: current.preferences.map((item) =>
        item.target === target ? { ...item, importance, evidence: "User-confirmed in the website" } : item
      )
    }));
  }

  function removePreference(target: string) {
    setProfile((current) => ({
      ...current,
      preferences: current.preferences.filter((item) => item.target !== target)
    }));
  }

  function reset() {
    setMessages([]);
    setDraft("");
    setProfile(emptyRecommendationState());
    setLatestResult(null);
    setLatestIncentives(null);
    setChosenTowns([]);
    setTinyStatus(useTiny ? "Cloud AI review is ready for your next message." : "Cloud AI review is off.");
    inputRef.current?.focus();
  }

  return (
    <div className={styles.shell}>
      <Chrome current="assistant" />
      <main id="content" className={styles.main}>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Lifestyle and policy guidance</p>
            <h1>AI Recommendation</h1>
            <p>
              Tell us about your lifestyle preferences and personal circumstances. SERINEA uses local town records
              and mock incentive policies to suggest regional areas for you to consider.
            </p>
          </div>
          <span className={styles.preview}>Local-first candidate</span>
        </header>

        <div className={styles.layout}>
          <section className={styles.conversation} aria-label="Assistant conversation">
            <div className={styles.toolbar}>
              <span>Regional Victoria · English input</span>
              <button type="button" disabled={messages.length === 0 && !draft} onClick={reset}>
                New chat
              </button>
            </div>

            <div className={styles.transcript}>
              {messages.length === 0 && (
                <div className={styles.welcome}>
                  <h2>What should your next town have?</h2>
                  <p>
                    Lifestyle preferences determine the town order. Facility counts show dataset availability,
                    not service quality or distance from a home.
                  </p>
                  <div className={styles.suggestions} aria-label="Example requests">
                    {examples.map((example) => (
                      <button key={example} type="button" onClick={() => send(example)}>
                        <span>{example}</span><span aria-hidden="true">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div role="log" aria-label="Messages" aria-live="polite">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={message.role === "user" ? styles.userMessage : styles.assistantMessage}
                  >
                    <strong>{message.role === "user" ? "You" : "SERINEA"}</strong>
                    <p>{message.text}</p>
                    {message.result && (
                      <TownResults
                        result={message.result}
                        incentives={message.incentives}
                        chosen={chosenTowns}
                        onToggle={(key) => setChosenTowns((current) =>
                          current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
                        )}
                      />
                    )}
                    {!message.result && message.incentives && (
                      <IncentiveResults response={message.incentives} />
                    )}
                  </article>
                ))}
                {loading && <p className={styles.loading} role="status">Reading your preferences and ranking verified town records…</p>}
              </div>
            </div>

            <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); send(draft); }}>
              <label htmlFor="assistant-message">Your message</label>
              <textarea
                ref={inputRef}
                id="assistant-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Example: A primary school is essential, and a park would be nice…"
              />
              <div>
                <span>You can correct a result in your next message.</span>
                <button type="submit" disabled={!draft.trim() || loading}>Send message</button>
              </div>
            </form>
          </section>

          <aside className={styles.review} aria-label="Extracted recommendation profile">
            <div className={styles.reviewHeading}>
              <div>
                <p className={styles.eyebrow}>Confirm before ranking</p>
                <h2>Your preferences</h2>
              </div>
              <span>{profile.preferences.length}</span>
            </div>

            {profile.preferences.length ? (
              <div className={styles.preferenceList}>
                {profile.preferences.map((preference) => (
                  <div className={styles.preference} key={preference.target}>
                    <div>
                      <strong>{preferenceLabel(preference.target)}</strong>
                      <button type="button" onClick={() => removePreference(preference.target)} aria-label={`Remove ${preferenceLabel(preference.target)}`}>Remove</button>
                    </div>
                    <label>
                      Importance
                      <select value={preference.importance} onChange={(event) => updateImportance(preference.target, event.target.value as Importance)}>
                        {IMPORTANCE_LEVELS.map((level) => <option key={level} value={level}>{IMPORTANCE_LABELS[level]}</option>)}
                      </select>
                    </label>
                  </div>
                ))}
                <button className={styles.updateButton} type="button" onClick={applyEditedPreferences} disabled={loading}>
                  Update recommendations
                </button>
              </div>
            ) : (
              <p className={styles.empty}>Supported facilities will appear here after your first message.</p>
            )}

            {profile.unsupported.length > 0 && (
              <div className={styles.unsupported}>
                <strong>Needs clarification</strong>
                <p>{profile.unsupported.join(", ")}</p>
                <span>These are visible but excluded from ranking.</span>
              </div>
            )}

            <div className={styles.localAi}>
              <label>
                <input
                  type="checkbox"
                  checked={useTiny}
                  onChange={(event) => {
                    setUseTiny(event.target.checked);
                    setTinyStatus(event.target.checked
                      ? "Cloud AI review will run after your next message."
                      : "Cloud AI review is off.");
                  }}
                />
                <span>
                  <strong>Cloud Qwen review</strong>
                  <small>Optional · no browser model download</small>
                </span>
              </label>
              <p>{tinyStatus}</p>
            </div>

            {latestResult && (
              <p className={styles.sourceNote}>
                Ranking source: {latestResult.dataSource === "database" ? "SERINEA database" : "Iteration 1 CSV"}.
                Incentives are never blended into the lifestyle order.
              </p>
            )}
            {latestIncentives && (
              <p className={styles.sourceNote}>
                Incentive source: 450 synthetic database records. Results are prototype screening only.
              </p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function TownResults({
  result,
  incentives,
  chosen,
  onToggle
}: {
  result: CompareResponse;
  incentives?: IncentiveResponse;
  chosen: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className={styles.results}>
      {result.preferences.some((preference) => preference.warning) && (
        <div className={styles.proxyWarning}>
          {result.preferences.filter((preference) => preference.warning).map((preference) => (
            <p key={preference.id}><strong>{preference.label}:</strong> {preference.warning}</p>
          ))}
        </div>
      )}
      <ol>
        {result.items.map((item) => {
          const key = `${item.locality}\u0000${item.lgaName}`;
          const incentiveGroup = incentives?.groups.find((group) =>
            group.locality === item.locality.toLocaleUpperCase("en-AU") &&
            group.lgaName === item.lgaName.toLocaleUpperCase("en-AU")
          );
          return <TownCard
            key={key}
            item={item}
            incentives={incentiveGroup}
            selected={chosen.includes(key)}
            onToggle={() => onToggle(key)}
          />;
        })}
      </ol>
      {incentives && <p className={styles.mockNotice}>{incentives.recordNotice}</p>}
    </div>
  );
}

function TownCard({
  item,
  incentives,
  selected,
  onToggle
}: {
  item: CompareRankItem;
  incentives?: IncentiveTownGroup;
  selected: boolean;
  onToggle: () => void;
}) {
  const mapHref = item.latitude != null && item.longitude != null
    ? `/map?lat=${item.latitude}&lng=${item.longitude}&town=${encodeURIComponent(item.locality)}`
    : "/map";

  return (
    <li className={selected ? styles.townSelected : styles.townRemoved}>
      <div className={styles.townTopline}>
        <span>{item.rank}</span>
        <div><h3>{titleCase(item.locality)}</h3><p>{titleCase(item.lgaName)}</p></div>
        <button type="button" onClick={onToggle}>{selected ? "Remove" : "Keep"}</button>
      </div>
      <dl>
        {item.breakdown.map((entry) => (
          <div key={entry.preferenceId}><dt>{entry.label}</dt><dd>{entry.count.toLocaleString("en-AU")} records</dd></div>
        ))}
      </dl>
      {incentives && <TownIncentives group={incentives} />}
      <Link href={mapHref}>View town on map →</Link>
    </li>
  );
}

function TownIncentives({ group }: { group: IncentiveTownGroup }) {
  return (
    <section className={styles.incentiveSignal} aria-label={`Mock incentives for ${titleCase(group.locality)}`}>
      <div>
        <strong>Separate incentive signal</strong>
        <span>{group.items.length} record{group.items.length === 1 ? "" : "s"}</span>
      </div>
      {group.items.length > 0 ? (
        <ul>
          {group.items.map((item) => <IncentiveItem key={item.subsidyId} item={item} />)}
        </ul>
      ) : (
        <p>No non-closed mock record passed the known-condition checks.</p>
      )}
    </section>
  );
}

function IncentiveItem({ item }: { item: IncentiveResultItem }) {
  return (
    <li>
      <div>
        <strong>{item.subsidyName.replace(/^\[MOCK\]\s*/, "")}</strong>
        <span className={styles.incentiveStatus}>{item.status}</span>
      </div>
      <p>
        {titleCase(item.benefitType)} · up to AUD {item.maxAmountAud.toLocaleString("en-AU")}
        {item.mockStatus === "mock_upcoming" ? " · upcoming in mock data" : ""}
      </p>
      {item.missing.length > 0 && <small>To verify: {item.missing.join(", ")}.</small>}
      <details>
        <summary>View mock rules and evidence</summary>
        <p>{item.eligibilitySummary.replace(/^FICTIONAL TEST RULES:\s*/i, "")}</p>
        <p><strong>Evidence:</strong> {item.requiredEvidence}</p>
      </details>
    </li>
  );
}

function IncentiveResults({ response }: { response: IncentiveResponse }) {
  return (
    <div className={styles.standaloneIncentives}>
      {response.needsAreaOrLifestyle ? (
        <p>Tell me a town, such as Lucas or Wangaratta, so I can retrieve its mock policy records.</p>
      ) : response.groups.map((group) => (
        <section key={`${group.locality}\u0000${group.lgaName}`}>
          <h3>{titleCase(group.locality)} <span>{titleCase(group.lgaName)}</span></h3>
          <TownIncentives group={group} />
        </section>
      ))}
      <p className={styles.mockNotice}>{response.recordNotice}</p>
    </div>
  );
}
