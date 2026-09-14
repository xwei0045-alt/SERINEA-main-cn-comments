"use client";

/**
 * Iteration 2 Incentives UI (/incentives).
 *
 * PRODUCT FLOW
 * 1. User enters occupation / job context + personal facts + a town (or later ranked towns).
 * 2. POST /api/incentives → IncentiveService screens mock subsidies for that area.
 * 3. Results stay separate from lifestyle ranking (Compare / AI Recommendation).
 * 4. Map / Compare / AI Recommendation remain available for the next step.
 *
 * LeanKit: Epic 2 · US2.1 occupation opportunities · US2.2 incentive guidance.
 * Occupation matching is honest: mock subsidies currently carry occupation_restriction=none,
 * so occupation is captured as context and unsupported occupations are stated clearly.
 */

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Chrome } from "../components/Chrome";
import { TownSearchField } from "../components/TownSearchField";
import { incentiveApiClient } from "@/frontend/api/IncentiveApiClient";
import type {
  IncentiveResponse,
  IncentiveResultItem,
  IncentiveTownGroup
} from "@/shared/contracts/incentives";
import styles from "./incentives.module.css";

type Stage = "planning_to_move" | "already_moved" | "unknown";

const EXAMPLE_OCCUPATIONS = [
  "Registered nurse",
  "Primary school teacher",
  "Diesel mechanic",
  "Aged care worker"
] as const;

function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("en-AU")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/[,$]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export default function IncentivesClient() {
  const [occupation, setOccupation] = useState("");
  const [locality, setLocality] = useState("");
  const [lgaName, setLgaName] = useState("");
  const [stage, setStage] = useState<Stage>("planning_to_move");
  const [age, setAge] = useState("");
  const [income, setIncome] = useState("");
  const [newResident, setNewResident] = useState<"unknown" | "yes" | "no">("unknown");
  const [moveDistanceKm, setMoveDistanceKm] = useState("");
  const [daysSinceMove, setDaysSinceMove] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IncentiveResponse | null>(null);

  const occupationNote = useMemo(() => {
    const value = occupation.trim();
    if (!value) {
      return "Add an occupation so we can keep job context with your incentive search. Town matching still uses the area you name.";
    }
    return `Occupation “${value}” is kept as context. Current mock incentive records do not yet filter by occupation, so every open incentive for the named town is screened against your other facts.`;
  }, [occupation]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const town = locality.trim();
    if (!town) {
      setError("Name a town or locality so we can screen incentives for that area.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const messageParts = [
        occupation.trim() ? `Occupation: ${occupation.trim()}.` : null,
        `Looking at incentives for ${town}${lgaName.trim() ? ` (${lgaName.trim()})` : ""}.`,
        stage === "planning_to_move"
          ? "I am planning to move."
          : stage === "already_moved"
            ? "I have already moved."
            : null
      ].filter(Boolean);

      const lga = lgaName.trim();
      const response = await incentiveApiClient.find({
        message: messageParts.join(" "),
        relocationStage: stage,
        profile: {
          age: parseOptionalNumber(age),
          income: parseOptionalNumber(income),
          income_scope: "household",
          income_period: "annual",
          income_basis: "gross",
          has_child: null,
          child_ages: [],
          locality: town,
          lga_name: lga || null,
          move_distance_km: parseOptionalNumber(moveDistanceKm),
          days_since_move: parseOptionalNumber(daysSinceMove),
          new_resident:
            newResident === "yes" ? true : newResident === "no" ? false : null
        },
        // Empty towns → IncentiveService resolves locality (+ optional LGA) from profile/message.
        towns: lga
          ? [
              {
                locality: town.toLocaleUpperCase("en-AU"),
                lgaName: lga.toLocaleUpperCase("en-AU")
              }
            ]
          : [],
        limitPerTown: 3
      });
      setResult(response);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Incentive screening failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.shell}>
      <Chrome current="incentives" />
      <main className={styles.main}>
        <p className={styles.eyebrow}>Iteration 2</p>
        <h1>Incentives</h1>
        <p className={styles.lead}>
          Start from your job context and personal situation, screen regional incentives for a town,
          then use Compare or AI Recommendation to decide where to live.
        </p>

        <div className={styles.grid}>
          <section className={styles.panel} aria-labelledby="incentives-form-title">
            <h2 id="incentives-form-title">Find incentives for a town</h2>
            <p>
              Enter occupation and eligibility facts, then name the town you want to check.
              Incentive signals stay separate from lifestyle town ranking.
            </p>

            <form className={styles.fields} onSubmit={onSubmit}>
              <div className={styles.field}>
                <label htmlFor="occupation">Occupation / job</label>
                <input
                  id="occupation"
                  name="occupation"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g. Registered nurse"
                  list="occupation-examples"
                  autoComplete="organization-title"
                />
                <datalist id="occupation-examples">
                  {EXAMPLE_OCCUPATIONS.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>

              <div className={styles.townField}>
                <TownSearchField
                  id="locality"
                  label="Town / locality"
                  value={locality}
                  onValueChange={(value) => {
                    setLocality(value);
                    setLgaName("");
                  }}
                  placeholder="Type to see towns from our data…"
                  onSelect={(item) => {
                    setLocality(titleCase(item.locality));
                    setLgaName(titleCase(item.lgaName));
                  }}
                />
                {lgaName ? (
                  <p className={styles.lgaHint}>
                    LGA: <strong>{lgaName}</strong>
                  </p>
                ) : (
                  <p className={styles.lgaHint}>
                    Pick a suggested town so we use the matching LGA from the dataset.
                  </p>
                )}
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="stage">Relocation stage</label>
                  <select
                    id="stage"
                    name="stage"
                    value={stage}
                    onChange={(e) => setStage(e.target.value as Stage)}
                  >
                    <option value="planning_to_move">Planning to move</option>
                    <option value="already_moved">Already moved</option>
                    <option value="unknown">Not sure yet</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="new-resident">New resident</label>
                  <select
                    id="new-resident"
                    name="new-resident"
                    value={newResident}
                    onChange={(e) =>
                      setNewResident(e.target.value as "unknown" | "yes" | "no")
                    }
                  >
                    <option value="unknown">Unknown</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="age">Age (optional)</label>
                  <input
                    id="age"
                    name="age"
                    inputMode="numeric"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 28"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="income">Gross household income / year (optional)</label>
                  <input
                    id="income"
                    name="income"
                    inputMode="numeric"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="e.g. 80000"
                  />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="distance">Move distance km (optional)</label>
                  <input
                    id="distance"
                    name="distance"
                    inputMode="decimal"
                    value={moveDistanceKm}
                    onChange={(e) => setMoveDistanceKm(e.target.value)}
                    placeholder="e.g. 60"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="days">Days since move (optional)</label>
                  <input
                    id="days"
                    name="days"
                    inputMode="numeric"
                    value={daysSinceMove}
                    onChange={(e) => setDaysSinceMove(e.target.value)}
                    placeholder="e.g. 30"
                  />
                </div>
              </div>

              <p className={styles.notice}>{occupationNote}</p>

              <div className={styles.actions}>
                <button type="submit" disabled={busy}>
                  {busy ? "Screening…" : "Screen incentives"}
                </button>
                <Link href="/ai-assistant">Open AI Recommendation</Link>
                <Link href="/compare">Rank towns on Compare</Link>
              </div>
            </form>

            {error ? <p className={styles.error}>{error}</p> : null}

            {result ? (
              result.groups.length === 0 ? (
                <p className={styles.empty}>
                  No mock incentives matched that area yet. Try another town spelling, or use AI
                  Recommendation with lifestyle preferences to pick towns first.
                </p>
              ) : (
                result.groups.map((group) => (
                  <TownGroup key={`${group.locality}-${group.lgaName}`} group={group} />
                ))
              )
            ) : null}

            {result?.recordNotice ? (
              <p className={styles.notice}>{result.recordNotice}</p>
            ) : null}
          </section>

          <aside className={styles.panel} aria-labelledby="incentives-flow-title">
            <h2 id="incentives-flow-title">How Iteration 2 works</h2>
            <ol className={styles.steps}>
              <li>
                <strong>1. Job context</strong>
                <span>Capture the occupation you work in or want to pursue in regional Victoria.</span>
              </li>
              <li>
                <strong>2. Incentive screen</strong>
                <span>Match personal facts against mock regional incentives for a named town.</span>
              </li>
              <li>
                <strong>3. Best towns</strong>
                <span>
                  Use Compare for lifestyle ranking, or AI Recommendation for guided lifestyle +
                  incentive help, then open Map.
                </span>
              </li>
            </ol>
          </aside>
        </div>
      </main>
    </div>
  );
}

function TownGroup({ group }: { group: IncentiveTownGroup }) {
  return (
    <div className={styles.group}>
      <h3>
        {titleCase(group.locality)}
        {group.lgaName && group.lgaName !== "UNKNOWN"
          ? ` · ${titleCase(group.lgaName)}`
          : ""}
      </h3>
      {group.items.map((item) => (
        <IncentiveCard key={item.subsidyId} item={item} />
      ))}
    </div>
  );
}

function IncentiveCard({ item }: { item: IncentiveResultItem }) {
  return (
    <article className={styles.card}>
      <span className={styles.status}>{item.status}</span>
      <strong>{item.subsidyName}</strong>
      <p>
        {item.benefitType}
        {item.maxAmountAud > 0 ? ` · up to A$${item.maxAmountAud.toLocaleString("en-AU")}` : ""}
      </p>
      <p>{item.eligibilitySummary}</p>
      {item.missing.length > 0 ? (
        <p>Still needed: {item.missing.join(", ")}</p>
      ) : null}
    </article>
  );
}
