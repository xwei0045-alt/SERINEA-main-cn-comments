"use client";

/**
 * ============================================================
 * FILE: IncentivesClient.tsx  →  Iteration 2 frontend (main UI)
 * ============================================================
 * WHAT TO SAY IF ASKED (30-second version):
 *   "This is our Iteration 2 page. User enters job + town, then we
 *    show matching regional incentives. Town suggestions come from
 *    the same locality data as Compare/Map."
 *
 * USER FLOW (point at the form while talking):
 *   1. Your job
 *   2. Town (typeahead from our dataset)
 *   3. Moving status
 *   4. Optional extra details (age, income, …) — collapsed by default
 *   5. Find incentives → show result cards
 *
 * KEY PIECES BELOW (search these labels):
 *   [STATE]     — form values we remember while typing
 *   [SUBMIT]    — what happens when they click Find incentives
 *   [FORM UI]   — what the user sees
 *   [RESULTS]   — cards after the API responds
 */

import Link from "next/link";
import { FormEvent, useState } from "react";
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

/** Pretty town names for the UI (DAYLESFORD → Daylesford). */
function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("en-AU")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

/** Turns optional text boxes into numbers, or null if empty. */
function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/[,$]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export default function IncentivesClient() {
  // ---------- [STATE] form values ----------
  // WHAT TO SAY: "React state holds whatever the user typed."
  const [occupation, setOccupation] = useState("");
  const [locality, setLocality] = useState("");
  const [lgaName, setLgaName] = useState(""); // filled when they pick a suggested town
  const [stage, setStage] = useState<Stage>("planning_to_move");
  const [age, setAge] = useState("");
  const [income, setIncome] = useState("");
  const [newResident, setNewResident] = useState<"unknown" | "yes" | "no">("unknown");
  const [moveDistanceKm, setMoveDistanceKm] = useState("");
  const [daysSinceMove, setDaysSinceMove] = useState("");
  const [busy, setBusy] = useState(false); // true while waiting for the API
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IncentiveResponse | null>(null);

  // ---------- [SUBMIT] Find incentives ----------
  // WHAT TO SAY: "On submit we send job + town + optional facts to /api/incentives
  //              and store the response so the cards can render."
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const town = locality.trim();
    if (!town) {
      setError("Pick a town from the suggestions.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const lga = lgaName.trim();
      const response = await incentiveApiClient.find({
        message: [
          occupation.trim() ? `Occupation: ${occupation.trim()}.` : null,
          `Looking at incentives for ${town}${lga ? ` (${lga})` : ""}.`,
          stage === "planning_to_move"
            ? "I am planning to move."
            : stage === "already_moved"
              ? "I have already moved."
              : null
        ]
          .filter(Boolean)
          .join(" "),
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
        // If they picked a suggestion, send exact town + LGA from our dataset.
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

  // ---------- [FORM UI] what the user sees ----------
  return (
    <div className={styles.shell}>
      {/* Top nav — Incentives is highlighted here */}
      <Chrome current="incentives" />

      <main className={styles.main}>
        <h1>Incentives</h1>
        <p className={styles.lead}>
          Enter your job and a town. We screen regional incentives for that place.
        </p>

        <section className={styles.panel}>
          <form className={styles.fields} onSubmit={onSubmit}>
            {/* STEP 1 — job / occupation */}
            <div className={styles.field}>
              <label htmlFor="occupation">Your job</label>
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
                <option value="Registered nurse" />
                <option value="Primary school teacher" />
                <option value="Diesel mechanic" />
                <option value="Aged care worker" />
              </datalist>
            </div>

            {/* STEP 2 — town from our dataset (same component Compare uses) */}
            <div className={styles.townField}>
              <TownSearchField
                id="locality"
                label="Town"
                value={locality}
                onValueChange={(value) => {
                  setLocality(value);
                  setLgaName("");
                }}
                placeholder="Start typing a town…"
                onSelect={(item) => {
                  // Picking a suggestion also saves the matching LGA.
                  setLocality(titleCase(item.locality));
                  setLgaName(titleCase(item.lgaName));
                }}
              />
              {lgaName ? <p className={styles.lgaHint}>{lgaName}</p> : null}
            </div>

            {/* STEP 3 — planning vs already moved */}
            <div className={styles.field}>
              <label htmlFor="stage">Moving status</label>
              <select
                id="stage"
                name="stage"
                value={stage}
                onChange={(e) => setStage(e.target.value as Stage)}
              >
                <option value="planning_to_move">Planning to move</option>
                <option value="already_moved">Already moved</option>
                <option value="unknown">Not sure</option>
              </select>
            </div>

            {/* OPTIONAL — kept collapsed so the page stays simple */}
            <details className={styles.more}>
              <summary>More details (optional)</summary>
              <div className={styles.moreBody}>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label htmlFor="age">Age</label>
                    <input
                      id="age"
                      name="age"
                      inputMode="numeric"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="28"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="income">Household income / year</label>
                    <input
                      id="income"
                      name="income"
                      inputMode="numeric"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      placeholder="80000"
                    />
                  </div>
                </div>
                <div className={styles.row}>
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
                  <div className={styles.field}>
                    <label htmlFor="distance">Move distance (km)</label>
                    <input
                      id="distance"
                      name="distance"
                      inputMode="decimal"
                      value={moveDistanceKm}
                      onChange={(e) => setMoveDistanceKm(e.target.value)}
                      placeholder="60"
                    />
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="days">Days since move</label>
                  <input
                    id="days"
                    name="days"
                    inputMode="numeric"
                    value={daysSinceMove}
                    onChange={(e) => setDaysSinceMove(e.target.value)}
                    placeholder="30"
                  />
                </div>
              </div>
            </details>

            {/* STEP 4 — primary action */}
            <div className={styles.actions}>
              <button type="submit" disabled={busy}>
                {busy ? "Checking…" : "Find incentives"}
              </button>
              <Link href="/ai-assistant">Need help? Try AI Recommendation</Link>
            </div>
          </form>

          {/* ---------- [RESULTS] ---------- */}
          {error ? <p className={styles.error}>{error}</p> : null}

          {result ? (
            result.groups.length === 0 ? (
              <p className={styles.empty}>No incentives found for that town. Try another suggestion.</p>
            ) : (
              result.groups.map((group) => (
                <TownGroup key={`${group.locality}-${group.lgaName}`} group={group} />
              ))
            )
          ) : null}
        </section>
      </main>
    </div>
  );
}

/** One town heading + its incentive cards. */
function TownGroup({ group }: { group: IncentiveTownGroup }) {
  return (
    <div className={styles.group}>
      <h2>
        {titleCase(group.locality)}
        {group.lgaName && group.lgaName !== "UNKNOWN" ? ` · ${titleCase(group.lgaName)}` : ""}
      </h2>
      {group.items.map((item) => (
        <IncentiveCard key={item.subsidyId} item={item} />
      ))}
    </div>
  );
}

/**
 * One incentive result card.
 * Status examples: Potential Incentive / Possible Match / More Information Needed
 */
function IncentiveCard({ item }: { item: IncentiveResultItem }) {
  return (
    <article className={styles.card}>
      <span className={styles.status}>{item.status}</span>
      <strong>{item.subsidyName}</strong>
      <p>
        {item.benefitType}
        {item.maxAmountAud > 0 ? ` · up to A$${item.maxAmountAud.toLocaleString("en-AU")}` : ""}
      </p>
      {item.missing.length > 0 ? <p>Still needed: {item.missing.join(", ")}</p> : null}
    </article>
  );
}
