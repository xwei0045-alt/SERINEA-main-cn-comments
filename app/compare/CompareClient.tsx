"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Chrome } from "../components/Chrome";
import { TownSearchField } from "../components/TownSearchField";
import { compareApiClient } from "@/frontend/api/CompareApiClient";
import { preferenceWeights } from "@/lib/comparePriorities";
import {
  COMPARE_HIERARCHY_PREFERENCES,
  COMPARE_PREFERENCE_GROUPS
} from "@/lib/types";
import { findPreferences } from "@/lib/preferenceSearch";
import {
  preferenceLabel,
  toggleHierarchicalPreference
} from "@/lib/preferenceHierarchy";
import type { CompareRankItem, CompareResponse } from "@/shared/contracts/compare";
import styles from "./compareFlow.module.css";

const scoreFormat = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 });
const knownPrefs = new Set(COMPARE_HIERARCHY_PREFERENCES.map((pref) => pref.id));

type Step = 1 | 2 | 3;

function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("en-AU")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function prefsFromQuery(raw: string | null): string[] | null {
  if (!raw) return null;
  const values = [
    ...new Set(
      raw
        .split(",")
        .map((item) => item.trim())
        .filter((id) => knownPrefs.has(id))
    )
  ];
  return values.length ? values : null;
}

/** Three-step compare flow: facilities → area → ranked ladder. */
export default function CompareClient() {
  const searchParams = useSearchParams();
  const bootPrefs = prefsFromQuery(searchParams.get("prefs"));
  const [step, setStep] = useState<Step>(bootPrefs?.length ? 3 : 1);
  const [selected, setSelected] = useState<string[]>(bootPrefs ?? []);
  const [priority, setPriority] = useState(false);
  const [area, setArea] = useState("");
  const [areaDraft, setAreaDraft] = useState("");
  const [prefQuery, setPrefQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(["education"]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const available = useMemo(
    () => findPreferences(prefQuery, selected, COMPARE_HIERARCHY_PREFERENCES),
    [prefQuery, selected]
  );

  useEffect(() => {
    const next = prefsFromQuery(searchParams.get("prefs"));
    if (next) {
      setSelected(next);
      setStep(3);
    }
  }, [searchParams]);

  useEffect(() => {
    if (step !== 3) return;
    setResult(null);
    if (selected.length === 0) {
      setLoading(false);
      setError("Choose at least one facility.");
      return;
    }

    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      compareApiClient
        .rank(
          {
            prefs: selected,
            weights: preferenceWeights(selected.length, priority),
            limit: 10,
            q: area || undefined
          },
          controller.signal
        )
        .then((next) => {
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
  }, [selected, priority, area, step]);

  const matches = result?.items.slice(0, 10) ?? [];

  function toggle(id: string) {
    setSelected((current) => toggleHierarchicalPreference(current, id));
  }

  function toggleGroup(id: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function preferenceGroupLabel(id: string): string {
    return COMPARE_PREFERENCE_GROUPS.find((group) =>
      group.preferenceId === id || group.childIds.some((childId) => childId === id)
    )?.label ?? "Facility";
  }

  return (
    <div className={styles.shell}>
      <Chrome current="compare" />
      <main id="content" className={styles.main}>
        <ol className={styles.steps} aria-label="Compare steps">
          {[
            { n: 1 as const, label: "Facilities" },
            { n: 2 as const, label: "Area" },
            { n: 3 as const, label: "Rankings" }
          ].map((item) => (
            <li key={item.n}>
              <button
                type="button"
                className={step === item.n ? styles.stepOn : styles.step}
                aria-current={step === item.n ? "step" : undefined}
                disabled={item.n > 1 && selected.length === 0}
                onClick={() => setStep(item.n)}
              >
                <span>{item.n}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ol>

        {step === 1 && (
          <section className={styles.pane} aria-labelledby="step1">
            <h1 id="step1">What matters most?</h1>
            <p className={styles.lead}>
              Choose a broad category, or open it to select specific facility types.
            </p>
            <input
              className={styles.search}
              value={prefQuery}
              onChange={(event) => setPrefQuery(event.target.value)}
              placeholder="Filter facilities…"
              aria-label="Filter facilities"
              autoComplete="off"
            />
            <div className={styles.selectedRow}>
              {selected.length === 0 ? (
                <span>Select at least one.</span>
              ) : (
                selected.map((id) => {
                  const label = preferenceLabel(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={styles.pillOn}
                      aria-label={`Remove ${label}`}
                      onClick={() => toggle(id)}
                    >
                      {selected.indexOf(id) + 1}. {label} ×
                    </button>
                  );
                })
              )}
            </div>
            {prefQuery.trim() ? (
              <div className={styles.searchGrid} role="group" aria-label="Matching categories and facility types">
                {available.map((pref) => (
                  <button
                    key={pref.id}
                    type="button"
                    className={styles.tile}
                    onClick={() => {
                      toggle(pref.id);
                      setPrefQuery("");
                    }}
                  >
                    <strong>{preferenceLabel(pref.id)}</strong>
                    <small>
                      {COMPARE_PREFERENCE_GROUPS.some((group) => group.preferenceId === pref.id)
                        ? "Broad category"
                        : `${preferenceGroupLabel(pref.id)} · specific type`}
                    </small>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.categoryGrid} aria-label="Facility categories">
                {COMPARE_PREFERENCE_GROUPS.map((group) => {
                  const expanded = expandedGroups.has(group.id);
                  const parentSelected = selected.includes(group.preferenceId);
                  const childCount = group.childIds.filter((id) => selected.includes(id)).length;
                  return (
                    <article
                      key={group.id}
                      className={`${styles.categoryCard} ${parentSelected || childCount > 0 ? styles.categoryHasSelection : ""}`}
                    >
                      <div className={styles.categoryTop}>
                        <button
                          type="button"
                          className={parentSelected ? styles.categorySelected : styles.categoryPick}
                          aria-pressed={parentSelected}
                          onClick={() => toggle(group.preferenceId)}
                        >
                          <span>Broad category</span>
                          <strong>{group.label}</strong>
                          <small>{group.description}</small>
                        </button>
                        <button
                          type="button"
                          className={styles.branchToggle}
                          aria-expanded={expanded}
                          aria-controls={`category-${group.id}`}
                          onClick={() => toggleGroup(group.id)}
                        >
                          {expanded ? "Hide types" : `View ${group.childIds.length} types`}
                          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                        </button>
                      </div>
                      {expanded && (
                        <div id={`category-${group.id}`} className={styles.categoryBranch}>
                          <p>
                            {parentSelected
                              ? "Choosing a specific type will replace this broad category."
                              : "Choose one or more specific types."}
                          </p>
                          <div>
                            {group.childIds.map((id) => {
                              const active = selected.includes(id);
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  className={active ? styles.subcategoryOn : styles.subcategory}
                                  aria-pressed={active}
                                  onClick={() => toggle(id)}
                                >
                                  {preferenceLabel(id)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
            {prefQuery.trim() && available.length === 0 && (
              <p className={styles.note} role="status">
                Not found — no facility matched “{prefQuery.trim()}”.
              </p>
            )}
            <div className={styles.footer}>
              <button
                type="button"
                className={styles.next}
                disabled={selected.length === 0}
                onClick={() => setStep(2)}
              >
                Next: area →
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className={styles.pane} aria-labelledby="step2">
            <h1 id="step2">Choose an area</h1>
            <p className={styles.lead}>
              Optional. Leave blank for all regional Victoria.
            </p>
            <div className={styles.areaField}>
              <TownSearchField
                id="compare-area"
                label="Town or LGA (optional)"
                value={areaDraft}
                onValueChange={setAreaDraft}
                placeholder="Type to limit ranking…"
                onSelect={(item) => {
                  setAreaDraft(item.locality);
                  setArea(item.locality);
                }}
              />
            </div>
            {area && (
              <p className={styles.areaChip}>
                Limited to <strong>{titleCase(area)}</strong>
                <button
                  type="button"
                  onClick={() => {
                    setArea("");
                    setAreaDraft("");
                  }}
                >
                  Clear
                </button>
              </p>
            )}
            <div className={styles.weight} role="group" aria-label="How to weight your picks">
              <p className={styles.weightLabel}>Ranking priority</p>
              <div className={styles.weightSeg}>
                <button
                  type="button"
                  className={!priority ? styles.weightOn : styles.weightOff}
                  aria-pressed={!priority}
                  onClick={() => setPriority(false)}
                >
                  Equal
                </button>
                <button
                  type="button"
                  className={priority ? styles.weightOn : styles.weightOff}
                  aria-pressed={priority}
                  onClick={() => setPriority(true)}
                >
                  First choice first
                </button>
              </div>
              {priority && (
                <ul className={styles.weightList} aria-label="Selected ranking weights">
                  {selected.map((id, index) => (
                    <li key={id}>
                      <span>
                        {index + 1}.{" "}
                        {preferenceLabel(id)}
                      </span>
                      <strong>
                        {(preferenceWeights(selected.length, priority)[index] * 100).toFixed(1)}%
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={styles.footer}>
              <button type="button" className={styles.back} onClick={() => setStep(1)}>
                ← Facilities
              </button>
              <button
                type="button"
                className={styles.next}
                disabled={selected.length === 0}
                onClick={() => setStep(3)}
              >
                See rankings →
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className={styles.pane} aria-labelledby="step3">
            <h1 id="step3">Town rankings</h1>
            <p className={styles.lead}>
              Based on{" "}
              {selected
                .map(preferenceLabel)
                .join(", ")}
              {area ? ` within ${titleCase(area)}` : ""}.
            </p>
            <div className={styles.footer} style={{ marginBottom: "1rem" }}>
              <button type="button" className={styles.back} onClick={() => setStep(1)}>
                Edit facilities
              </button>
              <button type="button" className={styles.back} onClick={() => setStep(2)}>
                Edit area & weights
              </button>
            </div>

            {loading && (
              <p className={styles.note} role="status">
                Ranking…
              </p>
            )}
            {error && (
              <p className={styles.note} role="alert">
                {error}
              </p>
            )}

            {result && matches.length > 0 && (
              <p className={styles.methodNote}>
                Scores combine explicit needs (75%), overall POI coverage (15%), and
                SAL/LGA profile evidence (10%). They do not measure nearby walking
                distance or service quality.
              </p>
            )}

            {result?.recommendation && (
              <div className={styles.winner}>
                <p>Top fit</p>
                <h2>{titleCase(result.recommendation.locality)}</h2>
                <p>{result.recommendation.summary}</p>
                {matches[0]?.latitude != null && matches[0]?.longitude != null && (
                  <Link
                    className={styles.next}
                    href={`/map?lat=${matches[0].latitude}&lng=${matches[0].longitude}&town=${encodeURIComponent(result.recommendation.locality)}`}
                  >
                    Open on map
                  </Link>
                )}
              </div>
            )}

            {matches.length > 0 && (
              <ol className={styles.ladder}>
                {matches.map((item, index) => (
                  <LadderRow key={`${item.locality}-${item.lgaName}`} item={item} rank={index + 1} />
                ))}
              </ol>
            )}

            {result && !loading && matches.length === 0 && !error && (
              <p className={styles.note} role="status">
                No locality matched those filters.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function LadderRow({ item, rank }: { item: CompareRankItem; rank: number }) {
  const mapHref =
    item.latitude != null && item.longitude != null
      ? `/map?lat=${item.latitude}&lng=${item.longitude}&town=${encodeURIComponent(item.locality)}`
      : "/map";

  return (
    <li className={styles.rung}>
      <span className={styles.rank}>{rank}</span>
      <div className={styles.rungBody}>
        <h3>{titleCase(item.locality)}</h3>
        <p>
          {titleCase(item.lgaName)} · {item.totalPoiCount.toLocaleString("en-AU")} places
        </p>
        <dl className={styles.counts}>
          {item.breakdown.map((entry) => (
            <div key={entry.preferenceId}>
              <dt>{entry.label}</dt>
              <dd>{entry.count.toLocaleString("en-AU")}</dd>
            </div>
          ))}
        </dl>
        <p>
          Score mix: needs {scoreFormat.format(item.scoreComponents.userNeeds.score)} × 75%;
          POI coverage {scoreFormat.format(item.scoreComponents.poiCoverage.score)} × 15%;
          area profile {scoreFormat.format(item.scoreComponents.areaProfile.score)} × 10%.
        </p>
      </div>
      <div className={styles.rungScore}>
        <span>Fit score</span>
        <strong>
          {scoreFormat.format(item.score)} <small>/ 100</small>
        </strong>
        <Link href={mapHref}>Map</Link>
      </div>
    </li>
  );
}
