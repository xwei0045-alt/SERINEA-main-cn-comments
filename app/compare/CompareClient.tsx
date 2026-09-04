"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Chrome } from "../components/Chrome";
import { compareApiClient } from "@/frontend/api/CompareApiClient";
import { localityApiClient } from "@/frontend/api/LocalityApiClient";
import { COMPARE_PREFERENCES } from "@/lib/types";
import type { CompareRankItem, CompareResponse } from "@/shared/contracts/compare";
import type { LocalitySummaryItem } from "@/shared/contracts/localities";

function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("en-AU")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

type DatasetHit = {
  id: string;
  label: string;
  hint: string;
};

function matchDatasets(query: string): DatasetHit[] {
  const q = query.trim().toLocaleLowerCase("en-AU");
  if (q.length < 1) return [];
  return COMPARE_PREFERENCES.filter((pref) => {
    const haystack = [pref.label, pref.id, ...pref.searchTerms, ...pref.subcategories]
      .join(" ")
      .toLocaleLowerCase("en-AU");
    return haystack.includes(q) || pref.searchTerms.some((term) => term.startsWith(q));
  }).map((pref) => ({
    id: pref.id,
    label: pref.label,
    hint: pref.subcategories.map((item) => item.replaceAll("_", " ")).join(", ")
  }));
}

export default function CompareClient() {
  const [selected, setSelected] = useState<string[]>(["grocery", "school", "gp", "park"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [townMatches, setTownMatches] = useState<LocalitySummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const prefSet = useMemo(() => new Set(selected), [selected]);
  const datasetHits = useMemo(() => matchDatasets(searchQuery), [searchQuery]);

  function togglePref(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function pickDataset(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSearchQuery("");
    setSearchOpen(false);
  }

  function pickTown(item: LocalitySummaryItem) {
    setAreaFilter(item.locality);
    setSearchQuery(titleCase(item.locality));
    setSearchOpen(false);
  }

  function clearAreaFilter() {
    setAreaFilter("");
    setSearchQuery("");
  }

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setTownMatches([]);
      return;
    }
    // If the query clearly matches only datasets, still allow town hits in parallel.
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      localityApiClient
        .search({ q: query, limit: 8 }, controller.signal)
        .then((response) => setTownMatches(response.items))
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          console.error("Compare town search failed.", err);
          setTownMatches([]);
        });
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

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
          { prefs: selected, limit: 15, q: areaFilter.trim() || undefined },
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
  }, [selected, areaFilter]);

  const showDropdown =
    searchOpen &&
    searchQuery.trim().length >= 1 &&
    (datasetHits.length > 0 || townMatches.length > 0 || searchQuery.trim().length >= 2);

  const nothingFound =
    searchOpen &&
    searchQuery.trim().length >= 2 &&
    datasetHits.length === 0 &&
    townMatches.length === 0;

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
            Search datasets (train, bus, gym, doctors, pharmacy…) or a town. Selected needs
            weigh the score.
          </p>

          <div className="compare-search-wrap">
            <label className="compare-search" htmlFor="compare-dataset-search">
              <span>Search datasets or towns</span>
            </label>
            <input
              id="compare-dataset-search"
              type="search"
              value={searchQuery}
              placeholder="e.g. train, bus stops, gym, doctors, pharmacy, Bendigo…"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={showDropdown}
              aria-controls="compare-search-results"
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setSearchOpen(false), 150);
              }}
            />
            {showDropdown && (
              <div id="compare-search-results" className="compare-search-results" role="listbox">
                {datasetHits.length > 0 && (
                  <div className="compare-search-group">
                    <p className="compare-search-heading">Datasets in the extract</p>
                    <ul>
                      {datasetHits.map((hit) => (
                        <li key={hit.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={prefSet.has(hit.id)}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => pickDataset(hit.id)}
                          >
                            <strong>{hit.label}</strong>
                            <span>{hit.hint}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {townMatches.length > 0 && (
                  <div className="compare-search-group">
                    <p className="compare-search-heading">Towns / LGAs</p>
                    <ul>
                      {townMatches.map((item) => (
                        <li key={`${item.locality}-${item.lgaName}`}>
                          <button
                            type="button"
                            role="option"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => pickTown(item)}
                          >
                            <strong>{titleCase(item.locality)}</strong>
                            <span>{titleCase(item.lgaName)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {nothingFound && (
              <p className="town-not-found" role="status">
                Not found. Try train, bus, gym, doctors, pharmacy, school, or a town name.
              </p>
            )}
            {areaFilter && (
              <p className="compare-area-chip">
                Narrowed to <strong>{titleCase(areaFilter)}</strong>
                <button type="button" onClick={clearAreaFilter}>
                  Clear town
                </button>
              </p>
            )}
          </div>

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
            {areaFilter.trim() ? ` for “${titleCase(areaFilter)}”` : ""}.
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
