"use client";

// Map screen. Pin starts in Shepparton because that town has places in the extract.
// The list is a straight line walk both ways at 4.8 km/h.
// After you pick a place we ask OSM streets for the orange path.
// GPS only follows if you are actually near the pin, so a Melbourne laptop does not jump the map.

import { useEffect, useMemo, useRef, useState } from "react";
import { IconCategory, IconLocate } from "../components/Icons";
import { localityApiClient } from "@/frontend/api/LocalityApiClient";
import { reachApiClient } from "@/frontend/api/ReachApiClient";
import { walkRouteApiClient } from "@/frontend/api/WalkRouteClient";
import { haversineKm } from "@/lib/geo";
import { MAP_MARK, categoryLabel, poiMarkClass } from "@/lib/mapMarks";
import { remainingAlongPath } from "@/lib/routeProgress";
import { DEMO_BANNER } from "@/lib/sources";
import { formatWalkDistance, walkingSecondsFromMeters } from "@/lib/walkCopy";
import {
  MAP_CATEGORIES,
  REGIONAL_DEFAULT,
  TOWN_JUMPS,
  WINDOW_MINUTES
} from "@/lib/types";
import type { LatLng, PoiCategory, ReachablePoi, WaterKind } from "@/lib/types";
import type { Isochrone } from "@/lib/reach";
import type { LocalitySummaryItem } from "@/shared/contracts/localities";
import type { ReachResponse } from "@/shared/contracts/reach";
import type { WalkRouteResponse } from "@/shared/contracts/walkRoute";
import ReachMap from "./ReachMap";
import { WalkHud } from "./WalkHud";

const NO_HULL: Isochrone = [];
const GPS_NEAR_PIN_M = 400;
const ARRIVE_M = 40;
const OFF_PATH_M = 80;
const REROUTE_MS = 12000;

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

function instructionFor(legDistance: number, remainingMeters: number, steps: { instruction: string; distanceMeters: number }[]) {
  if (!steps.length) return "Follow the orange path";
  const walked = Math.max(0, legDistance - remainingMeters);
  let covered = 0;
  for (const step of steps) {
    if (walked <= covered + step.distanceMeters * 0.9) return step.instruction;
    covered += step.distanceMeters;
  }
  return steps[steps.length - 1]?.instruction ?? "Follow the orange path";
}

export default function MapApp() {
  const [pin, setPin] = useState<LatLng>({
    lat: REGIONAL_DEFAULT.lat,
    lng: REGIONAL_DEFAULT.lng
  });
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [active, setActive] = useState<PoiCategory[] | "all">("all");
  const [result, setResult] = useState<ReachResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [townQuery, setTownQuery] = useState<string>(REGIONAL_DEFAULT.label);
  const [townMatches, setTownMatches] = useState<LocalitySummaryItem[]>([]);
  const [townOpen, setTownOpen] = useState(false);
  const [streetRoute, setStreetRoute] = useState<WalkRouteResponse | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [walkStarted, setWalkStarted] = useState(false);
  const [walkLeg, setWalkLeg] = useState<"there" | "back">("there");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [remainingMeters, setRemainingMeters] = useState(0);
  const [remainingPath, setRemainingPath] = useState<LatLng[] | null>(null);
  const [you, setYou] = useState<LatLng | null>(null);
  const [followGps, setFollowGps] = useState(false);
  const [arrived, setArrived] = useState(false);
  const followGpsRef = useRef(false);
  const lastRerouteRef = useRef(0);
  const pinRef = useRef(pin);
  const streetRouteRef = useRef(streetRoute);
  const selectedRef = useRef<ReachablePoi | null>(null);
  pinRef.current = pin;
  streetRouteRef.current = streetRoute;

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

  // Wait a beat so we are not hitting town search on every letter.
  useEffect(() => {
    const query = townQuery.trim();
    if (query.length < 2) {
      setTownMatches([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      localityApiClient
        .search({ q: query, limit: 8 }, controller.signal)
        .then((response) => setTownMatches(response.items))
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          console.error("Town search failed.", error);
          setTownMatches([]);
        });
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [townQuery]);

  const listed = useMemo(() => {
    const reachable = result?.reachable ?? [];
    if (active === "all") return reachable;
    return reachable.filter((row) => active.includes(row.poi.category));
  }, [result, active]);

  useEffect(() => {
    if (!listed.length) {
      setSelectedId(null);
      return;
    }
    if (!listed.some((row) => row.poi.id === selectedId)) {
      setSelectedId(listed[0].poi.id);
    }
  }, [listed, selectedId]);

  const selected = listed.find((row) => row.poi.id === selectedId) ?? null;
  selectedRef.current = selected;

  useEffect(() => {
    setWalkStarted(false);
    setFollowGps(false);
    followGpsRef.current = false;
    setYou(null);
    setArrived(false);
    setWalkLeg("there");
    setRemainingPath(null);
  }, [selectedId, pin.lat, pin.lng]);

  useEffect(() => {
    if (!selected) {
      setStreetRoute(null);
      setRouteError(null);
      return;
    }

    const controller = new AbortController();
    let current = true;
    setRouteLoading(true);
    setRouteError(null);

    walkRouteApiClient
      .fetchRoute(
        {
          from: pin,
          to: { lat: selected.poi.lat, lng: selected.poi.lng },
          roundtrip: true
        },
        controller.signal
      )
      .then((route) => {
        if (current) setStreetRoute(route);
      })
      .catch((error: unknown) => {
        if (!current || controller.signal.aborted) return;
        console.error("Walking route failed.", error);
        setStreetRoute(null);
        setRouteError("A street path could not be found for this place.");
      })
      .finally(() => {
        if (current) setRouteLoading(false);
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [selected?.poi.id, selected?.poi.lat, selected?.poi.lng, pin.lat, pin.lng]);

  const currentLeg = streetRoute?.legs.find((leg) => leg.id === walkLeg) ?? streetRoute?.legs[0] ?? null;

  const displayPath = useMemo(() => {
    if (walkStarted && remainingPath && remainingPath.length >= 2) return remainingPath;
    const leg =
      streetRoute?.legs.find((item) => item.id === walkLeg) ?? streetRoute?.legs[0] ?? null;
    return leg?.path ?? null;
  }, [walkStarted, remainingPath, streetRoute, walkLeg]);

  useEffect(() => {
    if (!walkStarted || arrived || followGps) return;
    const timer = window.setInterval(() => {
      const leg =
        streetRouteRef.current?.legs.find((item) => item.id === walkLeg) ??
        streetRouteRef.current?.legs[0];
      setRemainingSeconds((value) => {
        if (value <= 1) {
          setArrived(true);
          return 0;
        }
        return value - 1;
      });
      setRemainingMeters((value) => {
        if (!leg || leg.durationSeconds <= 0) return value;
        const metersPerSecond = leg.distanceMeters / leg.durationSeconds;
        return Math.max(0, value - metersPerSecond);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [walkStarted, arrived, followGps, walkLeg]);

  // Real GPS only if you are close to the pin. Otherwise the remaining clock just counts down.
  useEffect(() => {
    if (!walkStarted) return;
    if (!navigator.geolocation) return;

    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const fromPin = haversineKm(here, pinRef.current) * 1000;
        if (!followGpsRef.current && fromPin > GPS_NEAR_PIN_M) return;

        const route = streetRouteRef.current;
        const leg = route?.legs.find((item) => item.id === walkLeg) ?? route?.legs[0];
        if (!leg) return;

        followGpsRef.current = true;
        setFollowGps(true);
        setYou(here);

        const poi = selectedRef.current?.poi;
        const dest =
          walkLeg === "there" && poi ? { lat: poi.lat, lng: poi.lng } : pinRef.current;
        const progress = remainingAlongPath(leg.path, here);
        setRemainingPath(progress.remainingPath);
        setRemainingMeters(progress.remainingMeters);
        const seconds =
          leg.distanceMeters > 0
            ? (progress.remainingMeters / leg.distanceMeters) * leg.durationSeconds
            : walkingSecondsFromMeters(progress.remainingMeters);
        setRemainingSeconds(Math.max(0, Math.round(seconds)));

        if (progress.remainingMeters <= ARRIVE_M) {
          setArrived(true);
          return;
        }

        const now = Date.now();
        if (progress.offPathMeters > OFF_PATH_M && now - lastRerouteRef.current > REROUTE_MS) {
          lastRerouteRef.current = now;
          walkRouteApiClient
            .fetchRoute({ from: here, to: dest, roundtrip: false })
            .then((fresh) => {
              const nextLeg = fresh.legs[0];
              if (!nextLeg) return;
              setStreetRoute((prev) => {
                if (!prev) return fresh;
                const nextLegs = prev.legs.map((item) =>
                  item.id === walkLeg ? { ...nextLeg, id: walkLeg } : item
                );
                return { ...prev, legs: nextLegs, path: fresh.path };
              });
              setRemainingPath(nextLeg.path);
              setRemainingMeters(nextLeg.distanceMeters);
              setRemainingSeconds(Math.round(nextLeg.durationSeconds));
            })
            .catch(() => {
              /* keep the last path if the router is busy */
            });
        }
      },
      () => {
        /* countdown still runs from the pin if GPS is blocked */
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
    );

    return () => navigator.geolocation.clearWatch(watch);
  }, [walkStarted, walkLeg]);

  const waterMessage = waterCopy(result?.water ?? null);
  const placeWord = listed.length === 1 ? "place" : "places";
  const streetRoundTripSeconds = streetRoute?.durationSeconds ?? 0;
  const overBudget = streetRoundTripSeconds > WINDOW_MINUTES * 60;
  const nextInstruction = currentLeg
    ? instructionFor(currentLeg.distanceMeters, remainingMeters, currentLeg.steps)
    : "Follow the orange path";

  function endWalk() {
    setWalkStarted(false);
    setFollowGps(false);
    followGpsRef.current = false;
    setYou(null);
    setArrived(false);
    setWalkLeg("there");
    setRemainingPath(null);
  }

  function startWalk() {
    if (!currentLeg) return;
    setWalkLeg("there");
    setWalkStarted(true);
    setArrived(false);
    setYou(pin);
    setRemainingPath(currentLeg.path);
    setRemainingMeters(currentLeg.distanceMeters);
    setRemainingSeconds(Math.max(1, Math.round(currentLeg.durationSeconds)));
    followGpsRef.current = false;
    setFollowGps(false);
  }

  function startWalkBack() {
    const back = streetRoute?.legs.find((leg) => leg.id === "back");
    if (!back) return;
    setWalkLeg("back");
    setArrived(false);
    setRemainingPath(back.path);
    setRemainingMeters(back.distanceMeters);
    setRemainingSeconds(Math.max(1, Math.round(back.durationSeconds)));
  }

  function movePin(next: LatLng) {
    setPin(next);
    setTownOpen(false);
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

  function toggleCat(id: PoiCategory) {
    setActive((prev) => {
      if (prev === "all") return [id];
      const next = prev.includes(id) ? prev.filter((cat) => cat !== id) : [...prev, id];
      return next.length === 0 || next.length === MAP_CATEGORIES.length ? "all" : next;
    });
  }

  return (
    <>
      <p className="banner">
        <strong>Regional Victoria.</strong> {DEMO_BANNER}
      </p>
      <div className="map-shell">
        <div className="map-stage">
          <ReachMap
            pin={pin}
            hull={result?.hull ?? NO_HULL}
            reachable={listed}
            selectedId={selectedId}
            routePath={displayPath}
            you={walkStarted ? you ?? pin : null}
            navigating={walkStarted}
            showHull={!walkStarted}
            hasRoute={Boolean(displayPath && displayPath.length >= 2)}
            onPin={(pt) => {
              movePin(pt);
              setTownQuery("");
            }}
            onSelect={(id) => setSelectedId(id)}
          />
          {walkStarted && selected && (
            <WalkHud
              placeName={selected.poi.name}
              legLabel={walkLeg === "there" ? "Walking there" : "Walking back"}
              remainingSeconds={remainingSeconds}
              remainingMeters={remainingMeters}
              instruction={nextInstruction}
              arrived={arrived}
              canWalkBack={walkLeg === "there" && Boolean(streetRoute?.legs.some((leg) => leg.id === "back"))}
              overBudget={overBudget}
              onEnd={endWalk}
              onWalkBack={startWalkBack}
            />
          )}
          <ul className="map-legend" aria-label="Map key">
            <li>
              <span className="pin-marker" aria-hidden="true" />
              Start
            </li>
            <li>
              <span className="route-swatch" aria-hidden="true" />
              Walking path
            </li>
            {MAP_CATEGORIES.map((cat) => (
              <li key={cat.id}>
                <span className={poiMarkClass(cat.id)} aria-hidden="true">
                  {MAP_MARK[cat.id].letter}
                </span>
                {cat.label}
              </li>
            ))}
          </ul>
        </div>
        <aside className="panel" aria-label="Places within 15 minutes">
          <div className="panel-head">
            <h1>Within 15 minutes</h1>
            <p className="window-fixed" aria-live="polite">
              {loading && !result ? (
                <span>Looking up places you can walk to and back…</span>
              ) : (
                <span>
                  {listed.length} {placeWord} you can walk to and back. Pick a place to
                  see the street path.
                </span>
              )}
            </p>

            <label className="town-search">
              <span>Search a town</span>
              <input
                type="search"
                value={townQuery}
                placeholder="Shepparton, Mildura, Wodonga…"
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
                        <span>
                          {titleCase(item.lgaName)}
                          {item.totalPoiCount > 0
                            ? ` · ${item.totalPoiCount.toLocaleString("en-AU")} places`
                            : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </label>

            <div className="search-tools">
              <div className="town-chips" role="group" aria-label="Regional towns">
                {TOWN_JUMPS.map((town) => (
                  <button
                    key={town.label}
                    type="button"
                    aria-pressed={samePin(pin, town)}
                    disabled={walkStarted}
                    onClick={() => {
                      movePin({ lat: town.lat, lng: town.lng });
                      setTownQuery(town.label);
                    }}
                  >
                    {town.label}
                  </button>
                ))}
              </div>
              <button
                className="locate"
                type="button"
                onClick={locate}
                disabled={locating || walkStarted}
              >
                <IconLocate />
                {locating ? "Finding you…" : "Use my location"}
              </button>
            </div>

            <div className="filters" role="group" aria-label="Place type">
              <button type="button" aria-pressed={active === "all"} onClick={() => setActive("all")}>
                All
              </button>
              {MAP_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={active !== "all" && active.includes(cat.id)}
                  onClick={() => toggleCat(cat.id)}
                >
                  <IconCategory category={cat.id} size={16} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {denied && (
            <p className="status note">
              Location was blocked. The pin is at {REGIONAL_DEFAULT.label}. Search a
              town or click the map.
            </p>
          )}
          {failed && !denied && (
            <p className="status note">Location could not be read. Search a town or click the map.</p>
          )}
          {loading && result && <p className="status note">Updating places…</p>}
          {requestError && <p className="status halt">{requestError}</p>}
          {waterMessage && <p className="status halt">{waterMessage}</p>}
          {!waterMessage && result && result.outboundOnlyCount > 0 && (
            <p className="status note">
              {result.outboundOnlyCount} more{" "}
              {result.outboundOnlyCount === 1 ? "place is" : "places are"} close one
              way, but walking back would take more than 15 minutes. Those are hidden.
            </p>
          )}

          <div className="results">
            {waterMessage && (
              <div className="empty">
                <h2>Nothing to list on water</h2>
                <p>Move the pin onto land. The orange area only draws where a round trip is possible.</p>
              </div>
            )}
            {!loading && !requestError && !waterMessage && listed.length === 0 && (
              <div className="empty">
                <h2>Nothing within a 15-minute walk there and back</h2>
                <p>
                  This map covers regional Victoria, not inner Melbourne. Try
                  Shepparton, Bendigo, Mildura or Wodonga, or click a different spot.
                </p>
              </div>
            )}
            {listed.map((row) => {
              const isSelected = selectedId === row.poi.id;
              const mark = MAP_MARK[row.poi.category];
              const there = streetRoute?.legs.find((leg) => leg.id === "there");
              const back = streetRoute?.legs.find((leg) => leg.id === "back");
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
                    onClick={() => setSelectedId(row.poi.id)}
                  >
                    <div className="result-top">
                      <span className={poiMarkClass(row.poi.category, isSelected)} aria-hidden="true">
                        {mark.letter}
                      </span>
                      <div>
                        <h2>{row.poi.name}</h2>
                        <p className="meta">
                          {titleCase(row.poi.suburb)} · {categoryLabel(row.poi.category)}
                        </p>
                      </div>
                      <span className="mins">
                        {row.journey.roundTripMinutes}
                        <small> min</small>
                      </span>
                    </div>
                  </button>
                  {isSelected && (
                    <div className="journey">
                      <div className="trip-split">
                        <div>
                          <p className="trip-label">There</p>
                          <p className="trip-min">
                            {there
                              ? `${Math.max(1, Math.round(there.durationSeconds / 60))}`
                              : row.journey.outboundMinutes}{" "}
                            min
                          </p>
                          <p className="trip-note">
                            {routeLoading
                              ? "Finding the street path…"
                              : there
                                ? `${formatWalkDistance(there.distanceMeters)} along streets`
                                : row.journey.outbound[0]?.text}
                          </p>
                        </div>
                        <div>
                          <p className="trip-label">Back</p>
                          <p className="trip-min">
                            {back
                              ? `${Math.max(1, Math.round(back.durationSeconds / 60))}`
                              : row.journey.inboundMinutes}{" "}
                            min
                          </p>
                          <p className="trip-note">
                            {back
                              ? `${formatWalkDistance(back.distanceMeters)} along streets`
                              : row.journey.inbound[0]?.text}
                          </p>
                        </div>
                      </div>
                      {routeError && <p className="status note">{routeError}</p>}
                      {overBudget && there && (
                        <p className="status note">
                          Along streets this round trip is about{" "}
                          {Math.round(streetRoundTripSeconds / 60)} minutes, which is over the
                          15 minute budget.
                        </p>
                      )}
                      {there && there.steps.length > 0 && (
                        <ol className="walk-steps">
                          {there.steps.slice(0, 6).map((step, index) => (
                            <li key={`${step.instruction}-${index}`}>
                              {step.instruction}
                              <span>{formatWalkDistance(step.distanceMeters)}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                      <button
                        type="button"
                        className="walk-primary walk-primary--block"
                        disabled={!there || routeLoading || walkStarted}
                        onClick={startWalk}
                      >
                        {walkStarted ? "Walking…" : "Start walk"}
                      </button>
                      {result && (
                        <p className="source">
                          Path from {streetRoute?.source ?? result.sources.poi.name}. The
                          orange circle is a straight-line search; the orange line follows
                          streets.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </aside>
      </div>
    </>
  );
}
