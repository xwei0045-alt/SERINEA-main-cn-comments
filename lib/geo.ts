import type { LatLng, WaterKind } from "./types";

const R_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function destination(from: LatLng, bearingDeg: number, km: number): LatLng {
  const br = rad(bearingDeg);
  const ang = km / R_KM;
  const lat1 = rad(from.lat);
  const lng1 = rad(from.lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(ang) + Math.cos(lat1) * Math.sin(ang) * Math.cos(br)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(ang) * Math.cos(lat1),
      Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: deg(lat2), lng: deg(lng2) };
}

function rad(d: number) {
  return (d * Math.PI) / 180;
}
function deg(r: number) {
  return (r * 180) / Math.PI;
}

export function pointInPolygon(pt: LatLng, ring: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i].lat;
    const xi = ring[i].lng;
    const yj = ring[j].lat;
    const xj = ring[j].lng;
    const intersect =
      yi > pt.lat !== yj > pt.lat &&
      pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Conservative Port Phillip water — stays off St Kilda / Port Melbourne foreshore. */
const PORT_PHILLIP: LatLng[] = [
  { lat: -37.848, lng: 144.91 },
  { lat: -37.86, lng: 144.88 },
  { lat: -37.88, lng: 144.86 },
  { lat: -37.95, lng: 144.82 },
  { lat: -38.05, lng: 144.78 },
  { lat: -38.18, lng: 144.72 },
  { lat: -38.3, lng: 144.7 },
  { lat: -38.32, lng: 144.86 },
  { lat: -38.28, lng: 144.98 },
  { lat: -38.15, lng: 145.05 },
  { lat: -38.02, lng: 145.08 },
  { lat: -37.94, lng: 145.04 },
  { lat: -37.9, lng: 145.0 },
  { lat: -37.875, lng: 144.99 },
  { lat: -37.862, lng: 144.978 },
  { lat: -37.855, lng: 144.96 },
  { lat: -37.85, lng: 144.94 },
  { lat: -37.848, lng: 144.925 }
];

const ALBERT_PARK_LAKE: LatLng[] = [
  { lat: -37.8428, lng: 144.9682 },
  { lat: -37.844, lng: 144.9758 },
  { lat: -37.8482, lng: 144.979 },
  { lat: -37.8528, lng: 144.9772 },
  { lat: -37.8542, lng: 144.9708 },
  { lat: -37.8516, lng: 144.9662 },
  { lat: -37.8468, lng: 144.9654 }
];

const VICTORIA_HARBOUR: LatLng[] = [
  { lat: -37.8172, lng: 144.9398 },
  { lat: -37.8178, lng: 144.9462 },
  { lat: -37.8214, lng: 144.9468 },
  { lat: -37.8218, lng: 144.9412 },
  { lat: -37.8196, lng: 144.939 }
];

export function waterAt(pt: LatLng): WaterKind {
  if (pointInPolygon(pt, ALBERT_PARK_LAKE)) return "lake";
  if (pointInPolygon(pt, VICTORIA_HARBOUR)) return "harbour";
  if (pointInPolygon(pt, PORT_PHILLIP)) return "bay";
  return null;
}

export function distToSegmentKm(p: LatLng, a: LatLng, b: LatLng): number {
  const toXY = (q: LatLng) => {
    const x = ((q.lng - a.lng) * Math.PI) / 180 * Math.cos(rad((a.lat + b.lat) / 2)) * R_KM;
    const y = ((q.lat - a.lat) * Math.PI) / 180 * R_KM;
    return { x, y };
  };
  const P = toXY(p);
  const B = toXY(b);
  const len2 = B.x * B.x + B.y * B.y;
  if (len2 < 1e-12) return haversineKm(p, a);
  let t = (P.x * B.x + P.y * B.y) / len2;
  t = Math.max(0, Math.min(1, t));
  const proj = destination(a, bearing(a, b), haversineKm(a, b) * t);
  return haversineKm(p, proj);
}

export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

export function nearest<T extends LatLng>(pt: LatLng, items: T[], n: number): T[] {
  return items
    .map((item) => ({ item, d: haversineKm(pt, item) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.item);
}
