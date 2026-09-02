import { haversineKm, nearest, destination, waterAt } from "./geo";
import { STOPS } from "./stops";
import { POIS } from "./pois";
import { WINDOW_MINUTES } from "./types";
import type { Journey, LatLng, Leg, Mode, Poi, ReachablePoi, Stop } from "./types";

const WALK_KMH = 4.8;
const SPEED: Record<Exclude<Mode, "walk">, number> = {
  tram: 16,
  train: 36,
  bus: 14
};
const WAIT_OUT: Record<Exclude<Mode, "walk">, number> = {
  tram: 2.2,
  train: 3.0,
  bus: 3.5
};
const WAIT_RET: Record<Exclude<Mode, "walk">, number> = {
  tram: 2.4,
  train: 3.2,
  bus: 3.8
};
const WAIT_RET_ONEWAY: Record<Exclude<Mode, "walk">, number> = {
  tram: 5.5,
  train: 6.0,
  bus: 7.0
};

function walkMin(km: number) {
  return (km / WALK_KMH) * 60;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function shareRoute(a: Stop, b: Stop): string | null {
  for (const r of a.routes) {
    if (b.routes.includes(r)) return r;
  }
  return null;
}

type Directed = {
  minutes: number;
  legs: Leg[];
};

function walkOnly(from: LatLng, to: LatLng, toward: string): Directed {
  const minutes = round1(walkMin(haversineKm(from, to)));
  return {
    minutes,
    legs: [
      {
        mode: "walk",
        minutes,
        text: `Walk ${minutes} min to ${toward}`
      }
    ]
  };
}

function rideMinutes(a: Stop, b: Stop, returning: boolean): number {
  const km = haversineKm(a, b);
  const speed = SPEED[a.mode];
  const ride = (km / speed) * 60;
  const oneWay = a.oneWay || b.oneWay;
  const wait = returning
    ? oneWay
      ? WAIT_RET_ONEWAY[a.mode]
      : WAIT_RET[a.mode]
    : WAIT_OUT[a.mode];
  const reversePenalty = returning && oneWay ? ride * 0.35 : 0;
  return wait + ride + reversePenalty;
}

function viaStops(from: LatLng, to: LatLng, destName: string, returning: boolean): Directed {
  const walkDirect = walkOnly(from, to, destName);
  const fromStops = nearest(from, STOPS, 4);
  const toStops = nearest(to, STOPS, 4);

  let best: Directed = walkDirect;

  for (const a of fromStops) {
    const walkA = walkMin(haversineKm(from, a));
    if (walkA > 12) continue;
    for (const b of toStops) {
      const walkB = walkMin(haversineKm(b, to));
      if (walkB > 12) continue;

      if (a.id === b.id) {
        const minutes = round1(walkA + walkB);
        if (minutes < best.minutes) {
          best = {
            minutes,
            legs: [
              { mode: "walk", minutes: round1(walkA), text: `Walk ${round1(walkA)} min to ${a.name}` },
              { mode: "walk", minutes: round1(walkB), text: `Walk ${round1(walkB)} min to ${destName}` }
            ]
          };
        }
        continue;
      }

      const route = shareRoute(a, b);
      const sameMode = a.mode === b.mode;
      if (!route && !sameMode) continue;
      if (!route && haversineKm(a, b) > 3.2) continue;

      const ride = rideMinutes(a, b, returning);
      const transfer = route ? 0 : 4;
      const minutes = round1(walkA + ride + transfer + walkB);
      if (minutes >= best.minutes) continue;

      const mode: Mode = a.mode;
      const rideLabel = route
        ? `${cap(mode)} ${route}`
        : `${cap(mode)} (change at ${a.name})`;
      const rideMin = round1(ride + transfer);

      const candidates: Leg[] = [
        { mode: "walk", minutes: round1(walkA), text: `Walk ${round1(walkA)} min to ${a.name}` },
        { mode, minutes: rideMin, text: `${rideLabel}, ${rideMin} min to ${b.name}` },
        { mode: "walk", minutes: round1(walkB), text: `Walk ${round1(walkB)} min to ${destName}` }
      ];
      best = { minutes, legs: candidates.filter((leg) => leg.minutes >= 0.4) };
    }
  }

  return best;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function journeyBetween(from: LatLng, poi: Poi): Journey {
  const outbound = viaStops(from, poi, poi.name, false);
  const inbound = viaStops(poi, from, "your pin", true);
  return {
    outbound: outbound.legs,
    inbound: inbound.legs,
    outboundMinutes: outbound.minutes,
    inboundMinutes: inbound.minutes,
    roundTripMinutes: round1(outbound.minutes + inbound.minutes)
  };
}

/** True only if outbound AND return fit the same 15-minute budget. */
export function fitsRoundTrip(journey: Journey, window = WINDOW_MINUTES): boolean {
  return (
    journey.outboundMinutes > 0 &&
    journey.inboundMinutes > 0 &&
    journey.roundTripMinutes <= window + 1e-6
  );
}

export type ReachResult = {
  reachable: ReachablePoi[];
  /** Outbound ≤ 15 but outbound + return > 15 — hidden by the round-trip filter. */
  outboundOnlyCount: number;
  water: ReturnType<typeof waterAt>;
};

export function reachFrom(pin: LatLng, window = WINDOW_MINUTES): ReachResult {
  const water = waterAt(pin);
  if (water) {
    return { reachable: [], outboundOnlyCount: 0, water };
  }

  const reachable: ReachablePoi[] = [];
  let outboundOnlyCount = 0;

  for (const poi of POIS) {
    const journey = journeyBetween(pin, poi);
    if (fitsRoundTrip(journey, window)) {
      reachable.push({ poi, journey });
    } else if (journey.outboundMinutes <= window && journey.roundTripMinutes > window) {
      outboundOnlyCount += 1;
    }
  }

  reachable.sort((a, b) => a.journey.roundTripMinutes - b.journey.roundTripMinutes);
  return { reachable, outboundOnlyCount, water };
}

/** Outbound fits the window, return does not — omitted from the index. */
export function omittedFrom(pin: LatLng, window = WINDOW_MINUTES): ReachablePoi[] {
  if (waterAt(pin)) return [];
  const rows: ReachablePoi[] = [];
  for (const poi of POIS) {
    const journey = journeyBetween(pin, poi);
    if (journey.outboundMinutes <= window && journey.roundTripMinutes > window) {
      rows.push({ poi, journey });
    }
  }
  rows.sort((a, b) => a.journey.roundTripMinutes - b.journey.roundTripMinutes);
  return rows;
}

export type Isochrone = { lat: number; lng: number }[];

/** Polar hull of points whose round-trip PT approximation is within the window. */
export function isochroneFrom(pin: LatLng, window = WINDOW_MINUTES): Isochrone {
  if (waterAt(pin)) return [];
  const rays = 48;
  const hull: Isochrone = [];
  for (let i = 0; i < rays; i++) {
    const bearing = (360 / rays) * i;
    let lo = 0.05;
    let hi = 4.2;
    for (let k = 0; k < 7; k++) {
      const mid = (lo + hi) / 2;
      const pt = destination(pin, bearing, mid);
      if (waterAt(pt)) {
        hi = mid;
        continue;
      }
      const probe: Poi = {
        id: "iso",
        name: "probe",
        category: "park",
        lat: pt.lat,
        lng: pt.lng,
        suburb: ""
      };
      const j = journeyBetween(pin, probe);
      if (fitsRoundTrip(j, window)) lo = mid;
      else hi = mid;
    }
    hull.push(destination(pin, bearing, lo));
  }
  return hull;
}
