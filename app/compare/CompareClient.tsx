"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Chrome } from "../components/Chrome";
import { compareApiClient } from "@/frontend/api/CompareApiClient";
import { applyPreferenceSelection, preferenceWeights } from "@/lib/comparePriorities";
import type { CompareRankItem, CompareResponse } from "@/shared/contracts/compare";
import ComparePriorities from "./ComparePriorities";
import FloatingAssistant from "./FloatingAssistant";
import styles from "./CompareClient.module.css";

// Format display text only: 85.37 stays 85.37, and 100 stays 100.
const scoreFormat = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 });

function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("en-AU")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export default function CompareClient() {
  const [selected, setSelected] = useState<string[]>(["grocery", "school", "gp", "park"]);
  const [priority, setPriority] = useState(false);
  const [chatArea, setChatArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  useEffect(() => {
    // Clear old matches so they cannot be mistaken for the new selection's results.
    setResult(null);
    if (selected.length === 0) {
      setLoading(false);
      setError("Choose at least one preference.");
      return;
    }

    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      compareApiClient
        .rank({
          prefs: selected,
          weights: preferenceWeights(selected.length, priority),
          limit: 10,
          q: chatArea || undefined
        }, controller.signal)
        .then((next) => {
          // A slower, cancelled request must not replace the latest results.
          if (!controller.signal.aborted) setResult(next);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : "Compare failed.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [selected, priority, chatArea]);

  // Keep a frontend limit too, even if the API returns extra items.
  const matches = result?.items.slice(0, 10) ?? [];

  return (
    <div className={`how compare-page ${styles.page}`}>
      <Chrome current="compare" />
      <main id="content" className="compare-main">
        <h1>Find where to live</h1>
        <p className="lead">
          Choose what matters for your move. SERINEA ranks regional Victoria
          localities from the open data extract and points you to the strongest fit.
        </p>

        <section className="compare-panel" aria-label="Preferences">
          {/* Manual selection controls the same weights used by the API. */}
          <ComparePriorities
            selected={selected}
            onChange={setSelected}
            priority={priority}
            onPriorityChange={setPriority}
          />
        </section>

        {chatArea && <p className="compare-area-chip">
          Comparing within <strong>{chatArea}</strong>
          <button type="button" onClick={() => setChatArea("")}>All regions</button>
        </p>}

        {loading && <p className="status note" role="status">Ranking regional localities…</p>}
        {error && <p className="status halt" role="alert">{error}</p>}

        {result?.recommendation && (
          <section className="compare-reco" aria-live="polite">
            <p className="compare-reco-kicker">Most suitable</p>
            <h2>
              {titleCase(result.recommendation.locality)}
              <span> · score {scoreFormat.format(result.recommendation.score)}</span>
            </h2>
            <p>{result.recommendation.summary}</p>
            {matches[0]?.latitude != null && matches[0]?.longitude != null && (
              <Link className="cta"
                href={`/map?lat=${matches[0].latitude}&lng=${matches[0].longitude}&town=${encodeURIComponent(result.recommendation.locality)}`}>
                Open on map
              </Link>
            )}
          </section>
        )}

        {result && matches.length > 0 && (
          <section className="compare-results" aria-label="Ranked localities">
            <h2>Top {matches.length} matches
              <span className="compare-count">
                {" "}· {result.totalLocalitiesScored.toLocaleString("en-AU")} scored
              </span>
            </h2>
            <ol className="compare-list" role="list">
              {matches.map((item, index) => (
                <CompareRow key={`${item.locality}-${item.lgaName}`} item={item} rank={index + 1} />
              ))}
            </ol>
          </section>
        )}

        {result && !loading && matches.length === 0 && !error && (
          <p className="status note" role="status">No regional locality matched those filters.</p>
        )}
      </main>
      <FloatingAssistant onApply={({ preferences, area }) => {
        // Keep the user's priority order; append newly suggested criteria at the end.
        setSelected((current) => applyPreferenceSelection(current, preferences));
        setChatArea(area);
      }} />
    </div>
  );
}

function CompareRow({ item, rank }: { item: CompareRankItem; rank: number }) {
  const mapHref = item.latitude != null && item.longitude != null
    ? `/map?lat=${item.latitude}&lng=${item.longitude}&town=${encodeURIComponent(item.locality)}`
    : "/map";

  return (
    <li className={`compare-row ${styles.row}`}>
      <div className={`compare-row-top ${styles.rowTop}`}>
        {/* Only town results receive a ranking number. */}
        <span className={`compare-rank ${styles.rank}`} aria-label={`Rank ${rank}`}>{rank}</span>
        <div className={styles.town}>
          <h3>{titleCase(item.locality)}</h3>
          <p>{titleCase(item.lgaName)} · {item.totalPoiCount.toLocaleString("en-AU")} places in extract</p>
        </div>
        <div className={styles.score}>
          <span>Score</span>
          <strong>{scoreFormat.format(item.score)}</strong>
        </div>
      </div>

      {/* These are facility counts, not another ranked list. */}
      <dl className={styles.breakdown}>
        {item.breakdown.map((entry) => (
          <div key={entry.preferenceId}>
            <dt>{entry.label}:</dt>
            <dd>{entry.count.toLocaleString("en-AU")}</dd>
          </div>
        ))}
      </dl>
      <Link href={mapHref}>View on map</Link>
    </li>
  );
}
