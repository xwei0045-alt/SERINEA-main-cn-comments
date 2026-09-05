"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Chrome } from "../components/Chrome";
import { TownSearchField } from "../components/TownSearchField";
import { compareApiClient } from "@/frontend/api/CompareApiClient";
import { applyPreferenceSelection, preferenceWeights } from "@/lib/comparePriorities";
import { COMPARE_PREFERENCES } from "@/lib/types";
import { findPreferences } from "@/lib/preferenceSearch";
import type { CompareRankItem, CompareResponse } from "@/shared/contracts/compare";
import FloatingAssistant from "./FloatingAssistant";
import styles from "./compareFlow.module.css";

const scoreFormat = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 });
const knownPrefs = new Set(COMPARE_PREFERENCES.map((pref) => pref.id));

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
  const [chatArea, setChatArea] = useState("");
  const [areaDraft, setAreaDraft] = useState("");
  const [prefQuery, setPrefQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const available = useMemo(
    () => findPreferences(prefQuery, selected),
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
            q: chatArea || undefined
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
  }, [selected, priority, chatArea, step]);

  const matches = result?.items.slice(0, 10) ?? [];

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
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
            <h1 id="step1">What has to be in town?</h1>
            <p className={styles.lead}>
              Pick from the full extract — bus stations, schools, parks, clinics…
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
                <span>None selected</span>
              ) : (
                selected.map((id) => {
                  const label =
                    COMPARE_PREFERENCES.find((item) => item.id === id)?.label ?? id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={styles.pillOn}
                      onClick={() => toggle(id)}
                    >
                      {label} ×
                    </button>
                  );
                })
              )}
            </div>
            <div className={styles.grid} role="group" aria-label="Facilities">
              {(prefQuery.trim() ? available : COMPARE_PREFERENCES.filter((p) => !selected.includes(p.id))).map(
                (pref) => (
                  <button
                    key={pref.id}
                    type="button"
                    className={styles.tile}
                    onClick={() => {
                      toggle(pref.id);
                      setPrefQuery("");
                    }}
                  >
                    {pref.label}
                  </button>
                )
              )}
            </div>
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
            <h1 id="step2">Narrow the area?</h1>
            <p className={styles.lead}>
              Optional. Leave blank to rank across all regional Victoria.
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
                  setChatArea(item.locality);
                }}
              />
            </div>
            {chatArea && (
              <p className={styles.areaChip}>
                Limited to <strong>{titleCase(chatArea)}</strong>
                <button
                  type="button"
                  onClick={() => {
                    setChatArea("");
                    setAreaDraft("");
                  }}
                >
                  Clear
                </button>
              </p>
            )}
            <div className={styles.weight} role="group" aria-label="How to weight your picks">
              <p className={styles.weightLabel}>How to weight your picks</p>
              <div className={styles.weightSeg}>
                <button
                  type="button"
                  className={!priority ? styles.weightOn : styles.weightOff}
                  aria-pressed={!priority}
                  onClick={() => setPriority(false)}
                >
                  Equal weight
                </button>
                <button
                  type="button"
                  className={priority ? styles.weightOn : styles.weightOff}
                  aria-pressed={priority}
                  onClick={() => setPriority(true)}
                >
                  First pick matters most
                </button>
              </div>
            </div>
            <div className={styles.footer}>
              <button type="button" className={styles.back} onClick={() => setStep(1)}>
                ← Facilities
              </button>
              <button type="button" className={styles.next} onClick={() => setStep(3)}>
                See rankings →
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className={styles.pane} aria-labelledby="step3">
            <h1 id="step3">Town ladder</h1>
            <p className={styles.lead}>
              Best-fit localities from our data for{" "}
              {selected
                .map((id) => COMPARE_PREFERENCES.find((p) => p.id === id)?.label ?? id)
                .join(", ")}
              {chatArea ? ` within ${titleCase(chatArea)}` : ""}.
            </p>
            <div className={styles.footer} style={{ marginBottom: "1rem" }}>
              <button type="button" className={styles.back} onClick={() => setStep(1)}>
                Edit facilities
              </button>
              <button type="button" className={styles.back} onClick={() => setStep(2)}>
                Edit area
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
      <FloatingAssistant
        onApply={({ preferences, area }) => {
          setSelected((current) => applyPreferenceSelection(current, preferences));
          setChatArea(area);
          setAreaDraft(area);
          setStep(3);
        }}
      />
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
        <p className={styles.counts}>
          {item.breakdown.map((entry) => `${entry.label} ${entry.count}`).join(" · ")}
        </p>
      </div>
      <div className={styles.rungScore}>
        <strong>{scoreFormat.format(item.score)}</strong>
        <Link href={mapHref}>Map</Link>
      </div>
    </li>
  );
}
