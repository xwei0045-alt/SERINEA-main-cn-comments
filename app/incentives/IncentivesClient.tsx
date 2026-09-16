"use client";

/**
 * Iteration 2 Incentives page (main frontend UI).
 *
 * Easy pitch: user enters job and town, we show matching regional incentives.
 * Town suggestions use the same locality data as Compare and Map.
 *
 * Flow on the page:
 * 1. Your job
 * 2. Town (type to see suggestions from our data)
 * 3. Moving status
 * 4. Optional details (age, income, and so on) stay collapsed
 * 5. Find incentives, then show result cards
 *
 * Sections below are marked: STATE, SUBMIT, FORM, RESULTS.
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

// Make town names nicer for the screen (DAYLESFORD becomes Daylesford).
function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("en-AU")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

// Turn optional text into a number, or null if the box is empty.
function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/[,$]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export default function IncentivesClient() {
  // STATE: remember what the user typed.
  const [occupation, setOccupation] = useState("");
  const [locality, setLocality] = useState("");
  const [lgaName, setLgaName] = useState(""); // set when they pick a suggested town
  const [age, setAge] = useState("");
  const [income, setIncome] = useState("");
  const [newResident, setNewResident] = useState<"unknown" | "yes" | "no">("unknown");
  const [moveDistanceKm, setMoveDistanceKm] = useState("");
  const [daysSinceMove, setDaysSinceMove] = useState("");
  const [busy, setBusy] = useState(false); // true while we wait for the server
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IncentiveResponse | null>(null);

  // SUBMIT: send job + town (+ optional facts) and keep the response for the cards.
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const town = locality.trim();

    setBusy(true);
    setError(null);
    try {
      const lga = lgaName.trim();
      const response = await incentiveApiClient.find({
        message: [
          occupation.trim() ? `Occupation: ${occupation.trim()}.` : null,
          town ? `Looking at incentives for ${town}${lga ? ` (${lga})` : ""}.` : null
        ]
          .filter(Boolean)
          .join(" "),
        relocationStage: "unknown",
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
        // If they picked a suggestion, send the exact town and LGA from our data.
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

  // FORM: what the user sees on the page.
  return (
    <div className={styles.shell}>
      {/* Top nav. Incentives is the active link. */}
      <Chrome current="incentives" />

      <main className={styles.main}>
        <h1>Incentives</h1>
        <p className={styles.lead}>
          Enter your job and a town. We screen regional incentives for that place.
        </p>

        <section className={styles.panel}>
          <form className={styles.fields} onSubmit={onSubmit}>
            {/* Step 1: job */}
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
                <option value="General Practitioner" />
                <option value="Software Engineer" />
                <option value="Electrician" />
                <option value="Plumber" />
                <option value="Chef" />
                <option value="Accountant" />
                <option value="Social Worker" />
                <option value="Police Officer" />
              </datalist>
            </div>

            {/* Step 2: town from our dataset (optional) */}
            <div className={styles.townField}>
              <TownSearchField
                id="locality"
                label="Town (Optional)"
                value={locality}
                onValueChange={(value) => {
                  setLocality(value);
                  setLgaName("");
                }}
                placeholder="Start typing a town…"
                onSelect={(item) => {
                  // Also save the matching LGA when they pick a suggestion.
                  setLocality(titleCase(item.locality));
                  setLgaName(titleCase(item.lgaName));
                }}
              />
              {lgaName ? <p className={styles.lgaHint}>{lgaName}</p> : null}
            </div>

            {/* Optional fields stay hidden until opened */}
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

            {/* Step 4: main button */}
            <div className={styles.actions}>
              <button type="submit" disabled={busy}>
                {busy ? "Checking…" : "Find incentives"}
              </button>
              <Link href="/ai-assistant">Need help? Try AI Recommendation</Link>
            </div>
          </form>

          {/* RESULTS */}
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

// One town heading plus its incentive cards.
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

// One incentive card. Status can be Potential Incentive, Possible Match, or More Information Needed.
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
