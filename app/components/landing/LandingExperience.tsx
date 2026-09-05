"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { localityApiClient } from "@/frontend/api/LocalityApiClient";
import { COMPARE_PREFERENCES } from "@/lib/types";
import { FACTS, PHASES } from "@/lib/landingStory";
import styles from "./homeDesk.module.css";

type Mode = "town" | "priority";

const QUICK_PREFS = ["school", "grocery", "gp", "transit"] as const;

const MENTOR_RULES = [
  "Round-trip is the filter, not a caption.",
  "Fifteen minutes is fixed. No 30. No 60.",
  "Regional Victoria first. Not Melbourne CBD.",
  "Walking estimates only. Not live bus times.",
  "Show the working: journey + source + date."
];

/** Clean home: one promise, two clear paths, then proof. Features unchanged. */
export function LandingExperience() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("town");
  const [town, setTown] = useState("");
  const [prefs, setPrefs] = useState<string[]>(["grocery", "school", "gp"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prefLabels = useMemo(
    () =>
      COMPARE_PREFERENCES.filter((pref) =>
        QUICK_PREFS.includes(pref.id as (typeof QUICK_PREFS)[number])
      ),
    []
  );

  async function onTownSubmit(event: FormEvent) {
    event.preventDefault();
    const query = town.trim();
    if (query.length < 2) {
      setError("Type a regional town name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await localityApiClient.search({ q: query, limit: 8 });
      const match =
        result.items.find(
          (item) =>
            item.locality.toLocaleLowerCase("en-AU") === query.toLocaleLowerCase("en-AU")
        ) ?? result.items[0];
      if (!match?.latitude || !match?.longitude) {
        setError("That town was not found in the regional extract.");
        return;
      }
      router.push(
        `/map?${new URLSearchParams({
          lat: String(match.latitude),
          lng: String(match.longitude),
          town: match.locality
        })}`
      );
    } catch {
      setError("Town search failed. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function togglePref(id: string) {
    setPrefs((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function onPriorityGo() {
    if (prefs.length === 0) {
      setError("Pick at least one need.");
      return;
    }
    router.push(`/compare?${new URLSearchParams({ prefs: prefs.join(",") })}`);
  }

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.badge}>Regional Victoria · 15 min there and back</p>
        <h1 className={styles.title}>Know what you can actually reach</h1>
        <p className={styles.lead}>
          SERINEA only lists places you can walk to and get home from in fifteen
          minutes. One-way “nearby” does not count.
        </p>

        <div className={styles.pathGrid} aria-label="Choose how to start">
          <Link className={styles.pathPrimary} href="/map">
            <span className={styles.pathStep}>1</span>
            <span className={styles.pathBody}>
              <strong>Try the map</strong>
              <em>Drop a pin. See parks, shops, doctors and more in range.</em>
            </span>
          </Link>
          <Link className={styles.pathSecondary} href="/compare">
            <span className={styles.pathStep}>2</span>
            <span className={styles.pathBody}>
              <strong>Compare towns</strong>
              <em>Rank localities by schools, groceries, GPs and more. AI can help.</em>
            </span>
          </Link>
        </div>
      </section>

      <section className={styles.workspace} aria-labelledby="start-heading">
        <div className={styles.workspaceHead}>
          <h2 id="start-heading">Or jump straight in</h2>
          <p>Search a town for the map, or pick needs to rank places to live.</p>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="How to start">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "town"}
            className={mode === "town" ? styles.tabOn : styles.tab}
            onClick={() => {
              setMode("town");
              setError(null);
            }}
          >
            Find a town
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "priority"}
            className={mode === "priority" ? styles.tabOn : styles.tab}
            onClick={() => {
              setMode("priority");
              setError(null);
            }}
          >
            Set my priorities
          </button>
        </div>

        {mode === "town" ? (
          <form className={styles.form} onSubmit={onTownSubmit}>
            <label htmlFor="home-town">Town in regional Victoria</label>
            <div className={styles.formRow}>
              <input
                id="home-town"
                value={town}
                onChange={(event) => setTown(event.target.value)}
                placeholder="e.g. Shepparton"
                autoComplete="off"
              />
              <button type="submit" disabled={busy}>
                {busy ? "Finding…" : "Open map"}
              </button>
            </div>
          </form>
        ) : (
          <div className={styles.form}>
            <p className={styles.formLabel}>Tap what matters most</p>
            <div className={styles.chips} role="group" aria-label="Priorities">
              {prefLabels.map((pref) => {
                const on = prefs.includes(pref.id);
                return (
                  <button
                    key={pref.id}
                    type="button"
                    className={on ? styles.chipOn : styles.chip}
                    aria-pressed={on}
                    onClick={() => togglePref(pref.id)}
                  >
                    {pref.label}
                  </button>
                );
              })}
            </div>
            <div className={styles.formRow}>
              <button type="button" onClick={onPriorityGo}>
                Show ranked towns
              </button>
              <Link className={styles.quietLink} href="/compare">
                Open Compare + AI
              </Link>
            </div>
          </div>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </section>

      <section className={styles.section} aria-labelledby="problem-heading">
        <h2 id="problem-heading">Why this exists</h2>
        <div className={styles.cards}>
          {PHASES.map((phase) => (
            <article key={phase.id}>
              <h3>{phase.title}</h3>
              <p>{phase.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="rules-heading">
        <h2 id="rules-heading">What stays true in this demo</h2>
        <ul className={styles.rules}>
          {MENTOR_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="live-heading">
        <h2 id="live-heading">Already built</h2>
        <ul className={styles.live}>
          {FACTS.map((fact) => (
            <li key={fact.id}>
              <strong>{fact.kicker}</strong>
              <span>{fact.line}</span>
            </li>
          ))}
        </ul>
        <div className={styles.more}>
          <Link href="/how">How to read the map</Link>
          <Link href="/story">Previous story home</Link>
        </div>
      </section>
    </div>
  );
}
