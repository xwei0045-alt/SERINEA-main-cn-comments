"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Chrome } from "../components/Chrome";
import { compareApiClient } from "@/frontend/api/CompareApiClient";
import { COMPARE_PREFERENCES } from "@/lib/types";
import type { CompareRankItem, CompareResponse } from "@/shared/contracts/compare";

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
  const [areaQuery, setAreaQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const prefSet = useMemo(() => new Set(selected), [selected]);

  function togglePref(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  useEffect(() => {
    if (selected.length === 0) {
      setResult(null);
      setError("Choose at least one preference.");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      compareApiClient
        .rank(
          { prefs: selected, limit: 15, q: areaQuery.trim() || undefined },
          controller.signal
        )
        .then((next) => setResult(next))
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : "Compare failed.");
          setResult(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [selected, areaQuery]);

  return (
    <div className="how compare-page">
      <Chrome current="compare" />
      <main id="content" className="compare-main">
        <h1>Find where to live</h1>
        <p className="lead">
          Choose what matters for your move. SERINEA ranks regional Victoria
          localities from the open data extract and points you to the strongest fit.
        </p>

        <section className="compare-panel" aria-label="Preferences">
          <h2>What do you need nearby?</h2>
          <p className="compare-hint">
            Selected needs weigh the score. Schools matter more when Schools is on.
          </p>
          <div className="compare-prefs" role="group" aria-label="Preference filters">
            {COMPARE_PREFERENCES.map((pref) => (
              <button
                key={pref.id}
                type="button"
                className="compare-pref"
                aria-pressed={prefSet.has(pref.id)}
                onClick={() => togglePref(pref.id)}
              >
                {pref.label}
              </button>
            ))}
          </div>

          <label className="compare-search">
            <span>Optional: narrow by town or LGA name</span>
            <input
              type="search"
              value={areaQuery}
              placeholder="e.g. Bendigo, Mildura, Goulburn…"
              onChange={(event) => setAreaQuery(event.target.value)}
            />
          </label>
        </section>

        {loading && <p className="status note">Ranking regional localities…</p>}
        {error && <p className="status halt">{error}</p>}

        {result?.recommendation && (
          <section className="compare-reco" aria-live="polite">
            <p className="compare-reco-kicker">Most suitable</p>
            <h2>
              {titleCase(result.recommendation.locality)}
              <span> · score {result.recommendation.score}</span>
            </h2>
            <p>{result.recommendation.summary}</p>
            {result.items[0]?.latitude != null && result.items[0]?.longitude != null && (
              <Link
                className="cta"
                href={`/map?lat=${result.items[0].latitude}&lng=${result.items[0].longitude}&town=${encodeURIComponent(result.recommendation.locality)}`}
              >
                Open on map
              </Link>
            )}
          </section>
        )}

        {result && result.items.length > 0 && (
          <section className="compare-results" aria-label="Ranked localities">
            <h2>
              Top matches
              <span className="compare-count">
                {" "}
                · {result.totalLocalitiesScored.toLocaleString("en-AU")} scored
              </span>
            </h2>
            <ol className="compare-list">
              {result.items.map((item) => (
                <CompareRow key={`${item.locality}-${item.lgaName}`} item={item} />
              ))}
            </ol>
          </section>
        )}

        {result && !loading && result.items.length === 0 && !error && (
          <p className="status note">
            No regional locality matched those filters
            {areaQuery.trim() ? ` for “${areaQuery.trim()}”` : ""}.
          </p>
        )}
      </main>
    </div>
  );
}

function CompareRow({ item }: { item: CompareRankItem }) {
  const mapHref =
    item.latitude != null && item.longitude != null
      ? `/map?lat=${item.latitude}&lng=${item.longitude}&town=${encodeURIComponent(item.locality)}`
      : "/map";

  return (
    <li className="compare-row">
      <div className="compare-row-top">
        <span className="compare-rank">#{item.rank}</span>
        <div>
          <h3>{titleCase(item.locality)}</h3>
          <p>
            {titleCase(item.lgaName)} · {item.totalPoiCount.toLocaleString("en-AU")} places in
            extract
          </p>
        </div>
        <span className="compare-score">{item.score}</span>
      </div>
      <ul className="compare-break">
        {item.breakdown.map((row) => (
          <li key={row.preferenceId}>
            {row.label}: <strong>{row.count}</strong>
          </li>
        ))}
      </ul>
      <Link href={mapHref}>View on map</Link>
    </li>
  );
}
