"use client";

import { useMemo, useState } from "react";
import { IconLocate } from "../components/Icons";
import { gridRef } from "@/lib/grid";
import { isochroneFrom, reachFrom } from "@/lib/reach";
import { DEMO_BANNER, GTFS_SOURCE, OSM_SOURCE } from "@/lib/sources";
import { CATEGORIES, MELBOURNE_DEFAULT, WINDOW_MINUTES } from "@/lib/types";
import type { LatLng, Leg, PoiCategory } from "@/lib/types";
import ReachMap from "./ReachMap";

function waterCopy(kind: ReturnType<typeof reachFrom>["water"]) {
  if (kind === "bay") return "That’s Port Phillip. Public transport does not run on the water. Drop a pin on land.";
  if (kind === "lake") return "That’s Albert Park Lake. Drop a pin on land.";
  if (kind === "harbour") return "That’s Victoria Harbour. Drop a pin on land.";
  return null;
}

function LegRow({ legs, label }: { legs: Leg[]; label: string }) {
  return (
    <div className="leg-row" role="list" aria-label={label}>
      {legs.map((leg, i) => (
        <div key={`${label}-${i}`} className="leg-cell" role="listitem">
          <span className="leg-mode">{leg.mode}</span>
          <span className="leg-min">{leg.minutes}</span>
          <span className="leg-text">{leg.text}</span>
        </div>
      ))}
    </div>
  );
}

export default function MapApp() {
  const [pin, setPin] = useState<LatLng>({
    lat: MELBOURNE_DEFAULT.lat,
    lng: MELBOURNE_DEFAULT.lng
  });
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [active, setActive] = useState<PoiCategory[] | "all">("all");

  const result = useMemo(() => reachFrom(pin), [pin]);
  const hull = useMemo(() => isochroneFrom(pin), [pin]);

  const listed = useMemo(() => {
    if (active === "all") return result.reachable;
    return result.reachable.filter((row) => active.includes(row.poi.category));
  }, [result.reachable, active]);

  const waterMessage = waterCopy(result.water);

  function locate() {
    if (!navigator.geolocation) {
      setFailed(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setDenied(false);
        setFailed(false);
        setLocating(false);
        setSelectedId(null);
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
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      return next.length === 0 || next.length === CATEGORIES.length ? "all" : next;
    });
  }

  return (
    <>
      <p className="banner">
        <strong>Demonstration.</strong> {DEMO_BANNER}
      </p>
      <div className="map-shell">
        <div className="map-stage">
          <ReachMap
            pin={pin}
            hull={hull}
            reachable={listed}
            selectedId={selectedId}
            onPin={(pt) => {
              setPin(pt);
              setSelectedId(null);
            }}
            onSelect={(id) => {
              setSelectedId(id);
            }}
          />
        </div>
        <aside className="panel" aria-label="Places within 15 minutes">
          <div className="panel-head">
            <h1>Places in the index</h1>
            <p className="window-fixed">
              <b>{WINDOW_MINUTES}</b>
              <span>minutes round trip, public transport</span>
            </p>
            <button className="locate" type="button" onClick={locate} disabled={locating}>
              <IconLocate />
              {locating ? "Finding you…" : "Use my location"}
            </button>
            <div className="filters" role="group" aria-label="Place type">
              <button type="button" aria-pressed={active === "all"} onClick={() => setActive("all")}>
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={active !== "all" && active.includes(cat.id)}
                  onClick={() => toggleCat(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {denied && (
            <p className="status note">
              Location was denied. The pin is at {MELBOURNE_DEFAULT.label}. Click the map to move it.
            </p>
          )}
          {failed && !denied && (
            <p className="status note">Location could not be read. Click the map to drop a pin.</p>
          )}
          {waterMessage && <p className="status halt">{waterMessage}</p>}
          {!waterMessage && result.outboundOnlyCount > 0 && (
            <p className="status note">
              {result.outboundOnlyCount} place{result.outboundOnlyCount === 1 ? "" : "s"} sit within 15 minutes
              outbound but the return would blow the budget — hidden.
            </p>
          )}

          <div className="results">
            {waterMessage && (
              <div className="empty">
                <h2>No services here</h2>
                <p>Move the pin onto land. The overlay only draws where a round trip is possible.</p>
              </div>
            )}
            {!waterMessage && listed.length === 0 && (
              <div className="empty">
                <h2>Nothing in a 15-minute round trip</h2>
                <p>
                  No food, shops, gym, grocery, GP, pharmacy, park or museum from this pin fits
                  outbound plus return in fifteen minutes. Try a pin closer to trams or trains.
                </p>
              </div>
            )}
            {listed.map((row) => {
              const selected = selectedId === row.poi.id;
              return (
                <article
                  key={row.poi.id}
                  className="result"
                  data-open={selected ? "true" : "false"}
                >
                  <button
                    type="button"
                    className="result-hit"
                    aria-current={selected ? "true" : undefined}
                    onClick={() => setSelectedId(row.poi.id)}
                  >
                    <div className="result-top">
                      <span className="ref">{gridRef(row.poi.lat, row.poi.lng)}</span>
                      <div>
                        <h2>{row.poi.name}</h2>
                        <p className="meta">
                          {row.poi.suburb} · {row.poi.category}
                        </p>
                      </div>
                      <span className="mins">{row.journey.roundTripMinutes} min</span>
                    </div>
                  </button>
                  <div className="journey">
                    <div className="circuit">
                      <h3>There · {row.journey.outboundMinutes} min</h3>
                      <LegRow legs={row.journey.outbound} label="Outbound legs" />
                      <h3>Back · {row.journey.inboundMinutes} min</h3>
                      <LegRow legs={row.journey.inbound} label="Return legs" />
                    </div>
                    <p className="source">
                      <b>
                        {OSM_SOURCE.name} · {OSM_SOURCE.date}
                      </b>
                      {OSM_SOURCE.note}
                    </p>
                    <p className="source">
                      <b>
                        {GTFS_SOURCE.name} · {GTFS_SOURCE.date}
                      </b>
                      {GTFS_SOURCE.note}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </aside>
      </div>
    </>
  );
}
