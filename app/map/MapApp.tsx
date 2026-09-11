"use client";

// Map screen. Pin starts in Shepparton because that town has places in the extract.
// The list is a straight-line walk estimate at 4.8 km/h. Pins stay; no street path overlay.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IconCategory, IconLocate } from "../components/Icons";
import { localityApiClient } from "@/frontend/api/LocalityApiClient";
import { reachApiClient } from "@/frontend/api/ReachApiClient";
import { MAP_MARK, categoryLabel, poiMarkClass } from "@/lib/mapMarks";
import {
  DATASET_FACILITIES,
  REGIONAL_DEFAULT,
  TOWN_JUMPS,
  WINDOW_MINUTES
} from "@/lib/types";
import type { LatLng, WaterKind } from "@/lib/types";
import { findPreferences } from "@/lib/preferenceSearch";
import type { Isochrone } from "@/lib/reach";
import type { LocalitySummaryItem } from "@/shared/contracts/localities";
import type { ReachResponse } from "@/shared/contracts/reach";
import ReachMap from "./ReachMap";

const NO_HULL: Isochrone = [];

function titleCase(value: string) {
  return value
    .toLocaleLowerCase("en-AU")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function waterCopy(kind: WaterKind) {
  if (!kind) return null;
  return "That’s water. Move the pin onto land to see places nearby.";
}

function samePin(a: LatLng, b: LatLng) {
  return Math.abs(a.lat - b.lat) < 1e-5 && Math.abs(a.lng - b.lng) < 1e-5;
}

export default function MapApp() {
  const searchParams = useSearchParams();
  const bootLat = Number(searchParams.get("lat"));
  const bootLng = Number(searchParams.get("lng"));
  const bootTown = searchParams.get("town");
  const hasBootPin =
    Number.isFinite(bootLat) &&
    Number.isFinite(bootLng) &&
    bootLat >= -90 &&
    bootLat <= 90 &&
    bootLng >= -180 &&
    bootLng <= 180;

  const [pin, setPin] = useState<LatLng>({
    lat: hasBootPin ? bootLat : REGIONAL_DEFAULT.lat,
    lng: hasBootPin ? bootLng : REGIONAL_DEFAULT.lng
  });
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [active, setActive] = useState<string[] | "all">("all");
  const [filterQuery, setFilterQuery] = useState("");
  const [result, setResult] = useState<ReachResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [townQuery, setTownQuery] = useState<string>(
    bootTown ? titleCase(bootTown) : REGIONAL_DEFAULT.label
  );
  const [townMatches, setTownMatches] = useState<LocalitySummaryItem[]>([]);
  const [townOpen, setTownOpen] = useState(false);
  const [townNotFound, setTownNotFound] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  // Drop the last reach call if the pin moves again before it comes back.
  useEffect(() => {
    const controller = new AbortController();
    let currentRequest = true;

    setLoading(true);
    setRequestError(null);
    setResult(null);

    reachApiClient
      .search(
        {
          pin,
          windowMinutes: WINDOW_MINUTES
        },
        controller.signal
      )
      .then((nextResult) => {
        if (currentRequest) setResult(nextResult);
      })
      .catch((error: unknown) => {
        if (!currentRequest || controller.signal.aborted) return;
        console.error("Reachability request failed.", error);
        setRequestError("Places could not be loaded. Move the pin to try again.");
      })
      .finally(() => {
        if (currentRequest) setLoading(false);
      });

    return () => {
      currentRequest = false;
      controller.abort();
    };
  }, [pin]);

  // Filter towns from the first character; return every match in the extract.
  useEffect(() => {
    const query = townQuery.trim();
    if (!query) {
      setTownMatches([]);
      setTownNotFound(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      localityApiClient
        .search({ q: query, limit: 5000 }, controller.signal)
        .then((response) => {
          setTownMatches(response.items);
          setTownNotFound(response.items.length === 0);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          console.error("Town search failed.", error);
          setTownMatches([]);
          setTownNotFound(true);
        });
    }, 80);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [townQuery]);

  const listed = useMemo(() => {
    const reachable = result?.reachable ?? [];
    const filtered =
      active === "all"
        ? reachable
        : reachable.filter((row) => {
            const sub = row.poi.subcategory;
            return sub ? active.includes(sub) : active.includes(row.poi.category);
          });
    // Closest first — keeps the panel and map readable
    return [...filtered].sort(
      (a, b) => a.journey.outboundMinutes - b.journey.outboundMinutes
    );
  }, [result, active]);

  const filterOptions = useMemo(
    () => findPreferences(filterQuery),
    [filterQuery]
  );

  // Cap map dots so the densest towns stay usable (list still shows all matches).
  const mapListed = useMemo(() => {
    const cap = 80;
    const top = listed.slice(0, cap);
    if (selectedId && !top.some((row) => row.poi.id === selectedId)) {
      const picked = listed.find((row) => row.poi.id === selectedId);
      if (picked) return [...top.slice(0, cap - 1), picked];
    }
    return top;
  }, [listed, selectedId]);

  useEffect(() => {
    if (!listed.length) {
      setSelectedId(null);
      return;
    }
    // Drop selection if that place left the list — do not auto-pick another
    if (selectedId && !listed.some((row) => row.poi.id === selectedId)) {
      setSelectedId(null);
    }
  }, [listed, selectedId]);

  const waterMessage = waterCopy(result?.water ?? null);
  const placeWord = listed.length === 1 ? "place" : "places";

  function movePin(next: LatLng) {
    setPin(next);
    setTownOpen(false);
    setSelectedId(null);
  }

  function pickPlace(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
    setPanelOpen(false);
  }

  function closePanel() {
    setPanelOpen(false);
  }

  function jumpToTown(item: LocalitySummaryItem) {
    if (item.latitude == null || item.longitude == null) return;
    movePin({ lat: item.latitude, lng: item.longitude });
    setTownQuery(titleCase(item.locality));
  }

  function locate() {
    if (!navigator.geolocation) {
      setFailed(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        movePin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setTownQuery("");
        setDenied(false);
        setFailed(false);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) setDenied(true);
        else setFailed(true);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  function toggleFacility(id: string) {
    setActive((prev) => {
      if (prev === "all") return [id];
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      return next.length === 0 || next.length === DATASET_FACILITIES.length ? "all" : next;
    });
  }

  function facilityLabel(subcategory: string | undefined, category: string) {
    if (subcategory) {
      const hit = DATASET_FACILITIES.find((item) => item.subcategory === subcategory);
      if (hit) return hit.label;
    }
    return categoryLabel(category as Parameters<typeof categoryLabel>[0]);
  }

  return (
    <>
      <div className={`map-shell${panelOpen ? " map-shell--panel-open" : ""}`}>
        <div className="map-stage">
          <ReachMap
            pin={pin}
            hull={result?.hull ?? NO_HULL}
            reachable={mapListed}
            selectedId={selectedId}
            routePath={null}
            you={null}
            navigating={false}
            showHull
            hasRoute={false}
            onPin={(pt) => {
              movePin(pt);
              setTownQuery("");
            }}
            onSelect={(id) => pickPlace(id)}
          />

          <div className="map-dock">
            <div className="map-dock-panel">
              <label className="town-search">
                <span className="sr-only">Search a town</span>
                <input
                  type="search"
                  value={townQuery}
                  placeholder="Jump to any regional town…"
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={townOpen && townMatches.length > 0}
                  aria-controls="town-results"
                  onChange={(event) => {
                    setTownQuery(event.target.value);
                    setTownOpen(true);
                  }}
                  onFocus={() => setTownOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setTownOpen(false), 150);
                  }}
                />
                {townOpen && townMatches.length > 0 && (
                  <ul id="town-results" className="town-results" role="listbox">
                    {townMatches.map((item) => (
                      <li key={`${item.locality}-${item.lgaName}`}>
                        <button
                          type="button"
                          role="option"
                          disabled={item.latitude == null || item.longitude == null}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => jumpToTown(item)}
                        >
                          <strong>{titleCase(item.locality)}</strong>
                          <span>{titleCase(item.lgaName)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {townOpen && townNotFound && townQuery.trim().length > 0 && (
                  <p className="town-not-found" role="status">
                    Not found — “{townQuery.trim()}” is not in our regional towns.
                  </p>
                )}
              </label>
              <div className="town-chips" role="group" aria-label="Regional towns">
                {TOWN_JUMPS.map((town) => (
                  <button
                    key={town.label}
                    type="button"
                    aria-pressed={samePin(pin, town)}
                    onClick={() => {
                      movePin({ lat: town.lat, lng: town.lng });
                      setTownQuery(town.label);
                      setTownNotFound(false);
                    }}
                  >
                    {town.label}
                  </button>
                ))}
              </div>
              <label className="town-search filter-search">
                <span className="sr-only">Search place types</span>
                <input
                  type="search"
                  value={filterQuery}
                  placeholder="Filter: bus stop, school, pharmacy…"
                  autoComplete="off"
                  onChange={(event) => setFilterQuery(event.target.value)}
                />
              </label>
              {filterQuery.trim() && filterOptions.length === 0 && (
                <p className="town-not-found" role="status">
                  Not found — “{filterQuery.trim()}” is not in our place types.
                </p>
              )}
              <div className="filters" role="group" aria-label="Place type">
                <button type="button" aria-pressed={active === "all"} onClick={() => setActive("all")}>
                  All
                </button>
                {filterOptions.map((facility) => {
                  const mapCat =
                    DATASET_FACILITIES.find((item) => item.id === facility.id)?.mapCategory ??
                    "community";
                  return (
                    <button
                      key={facility.id}
                      type="button"
                      aria-pressed={active !== "all" && active.includes(facility.id)}
                      onClick={() => toggleFacility(facility.id)}
                    >
                      <IconCategory category={mapCat} size={14} />
                      <span>{facility.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="map-fab-row">
            <button
              type="button"
              className="map-fab map-fab--places"
              aria-expanded={panelOpen}
              aria-controls="places-panel"
              aria-label={panelOpen ? "Close places list" : "Open places list"}
              onClick={() => setPanelOpen((v) => !v)}
            >
              Places
              <span className="map-fab-count">{listed.length}</span>
            </button>
            <button
              type="button"
              className="map-fab map-fab--locate"
              onClick={locate}
              disabled={locating}
              aria-label="Use my location"
            >
              <IconLocate />
            </button>
          </div>
        </div>

        {panelOpen ? (
          <button
            type="button"
            className="panel-scrim"
            aria-label="Close places list"
            onClick={closePanel}
          />
        ) : null}

        <aside
          id="places-panel"
          className="panel"
          aria-label="Places within 15 minutes"
          data-open={panelOpen ? "true" : "false"}
        >
          <div className="panel-mobile-bar">
            <button type="button" className="panel-grab" aria-hidden="true" tabIndex={-1} />
            <button type="button" className="panel-close" onClick={closePanel}>
              Close
            </button>
          </div>
          <div className="panel-head">
            <div className="panel-title-row">
              <h1>Within 15 minutes</h1>
            </div>
            <p className="window-fixed" aria-live="polite">
              {loading && !result
                ? "Looking up places…"
                : `${listed.length} ${placeWord}. Tap one to select it on the map`}
            </p>
          </div>

          {denied && (
            <p className="status note">Location blocked. Search a town or tap the map.</p>
          )}
          {failed && !denied && (
            <p className="status note">Location failed. Search a town or tap the map.</p>
          )}
          {requestError && <p className="status halt">{requestError}</p>}
          {waterMessage && <p className="status halt">{waterMessage}</p>}

          <div className="results">
            {waterMessage && (
              <div className="empty">
                <h2>Pin is on water</h2>
                <p>Move it onto land to see places.</p>
              </div>
            )}
            {!loading && !requestError && !waterMessage && listed.length === 0 && (
              <div className="empty">
                <h2>Nothing within a 15-minute walk</h2>
                <p>Try Bendigo, Shepparton, or another town.</p>
              </div>
            )}
            {listed.map((row) => {
              const isSelected = selectedId === row.poi.id;
              const mark = MAP_MARK[row.poi.category];
              return (
                <article
                  key={row.poi.id}
                  className="result"
                  data-open={isSelected ? "true" : "false"}
                >
                  <button
                    type="button"
                    className="result-hit"
                    aria-expanded={isSelected}
                    aria-current={isSelected ? "true" : undefined}
                    onClick={() => pickPlace(row.poi.id)}
                  >
                    <div className="result-top">
                      <span className={poiMarkClass(row.poi.category, isSelected)} aria-hidden="true">
                        {mark.letter}
                      </span>
                      <div>
                        <h2>{row.poi.name}</h2>
                        <p className="meta">
                          {titleCase(row.poi.suburb)} ·{" "}
                          {facilityLabel(row.poi.subcategory, row.poi.category)}
                        </p>
                      </div>
                      <span className="mins" aria-label={`${row.journey.outboundMinutes} minute walk`}>
                        ({row.journey.outboundMinutes} min)
                      </span>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
        </aside>
      </div>
    </>
  );
}
