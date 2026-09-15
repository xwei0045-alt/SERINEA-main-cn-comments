import { haversineKm } from "@/lib/geo";

export type DedupePoi = {
  osmId: string;
  name: string;
  locality: string;
  subcategory: string;
  latitude: number;
  longitude: number;
};

const DEFAULT_METRES = 75;

/**
 * OSM often stores the same place as a node and a way a few metres apart.
 * Collapse those clones so Compare counts and map pins match lived places.
 */
export function dedupeRegionalPois<T extends DedupePoi>(
  pois: T[],
  maxMetres = DEFAULT_METRES
): T[] {
  const maxKm = maxMetres / 1000;
  const groups = new Map<string, T[]>();

  for (const poi of pois) {
    const nameKey = (poi.name || "").trim().toLocaleLowerCase("en-AU") || "__unnamed__";
    const key = `${poi.locality}\u0000${poi.subcategory}\u0000${nameKey}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(poi);
    else groups.set(key, [poi]);
  }

  const kept: T[] = [];
  for (const bucket of groups.values()) {
    kept.push(...collapseNear(bucket, maxKm));
  }
  return kept;
}

/** Handles the collapse near step. */
function collapseNear<T extends DedupePoi>(bucket: T[], maxKm: number): T[] {
  // Prefer a named record when choosing the survivor of a near-duplicate pair.
  const ordered = [...bucket].sort((a, b) => {
    const named = Number(Boolean(b.name?.trim())) - Number(Boolean(a.name?.trim()));
    if (named !== 0) return named;
    return a.osmId.localeCompare(b.osmId);
  });

  const survivors: T[] = [];
  for (const candidate of ordered) {
    const duplicate = survivors.some(
      (kept) =>
        haversineKm(
          { lat: kept.latitude, lng: kept.longitude },
          { lat: candidate.latitude, lng: candidate.longitude }
        ) <= maxKm
    );
    if (!duplicate) survivors.push(candidate);
  }
  return survivors;
}
