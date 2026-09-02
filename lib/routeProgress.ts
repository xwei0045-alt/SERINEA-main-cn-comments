import { haversineKm } from "./geo";
import type { LatLng } from "./types";

export type RemainingAlongPath = {
  remainingMeters: number;
  remainingPath: LatLng[];
  offPathMeters: number;
  snapped: LatLng;
  index: number;
};

function closestOnSegment(point: LatLng, a: LatLng, b: LatLng): {
  point: LatLng;
  t: number;
  distKm: number;
} {
  const abLat = b.lat - a.lat;
  const abLng = b.lng - a.lng;
  const lengthSq = abLat * abLat + abLng * abLng;
  const t =
    lengthSq === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((point.lat - a.lat) * abLat + (point.lng - a.lng) * abLng) / lengthSq)
        );
  const snapped = { lat: a.lat + abLat * t, lng: a.lng + abLng * t };
  return { point: snapped, t, distKm: haversineKm(point, snapped) };
}

export function remainingAlongPath(path: LatLng[], here: LatLng): RemainingAlongPath {
  if (path.length === 0) {
    return {
      remainingMeters: 0,
      remainingPath: [],
      offPathMeters: 0,
      snapped: here,
      index: 0
    };
  }
  if (path.length === 1) {
    const distKm = haversineKm(here, path[0]);
    return {
      remainingMeters: distKm * 1000,
      remainingPath: path,
      offPathMeters: distKm * 1000,
      snapped: path[0],
      index: 0
    };
  }

  let best = {
    i: 0,
    distKm: Infinity,
    point: path[0]
  };
  for (let i = 0; i < path.length - 1; i++) {
    const hit = closestOnSegment(here, path[i], path[i + 1]);
    if (hit.distKm < best.distKm) {
      best = { i, distKm: hit.distKm, point: hit.point };
    }
  }

  const remainingPath = [best.point, ...path.slice(best.i + 1)];
  let remainingMeters = 0;
  for (let i = 0; i < remainingPath.length - 1; i++) {
    remainingMeters += haversineKm(remainingPath[i], remainingPath[i + 1]) * 1000;
  }

  return {
    remainingMeters,
    remainingPath,
    offPathMeters: best.distKm * 1000,
    snapped: best.point,
    index: best.i
  };
}

export function nextStepIndex(
  steps: { location: LatLng }[],
  path: LatLng[],
  pathIndex: number
): number {
  if (!steps.length) return -1;
  const anchor = path[Math.min(pathIndex + 1, path.length - 1)] ?? path[path.length - 1];
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < steps.length; i++) {
    const dist = haversineKm(steps[i].location, anchor);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}
