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

export function dedupeRegionalPois<T extends DedupePoi>(
  // 先按 OSM ID 分组，再按空间距离合并近似重复点，返回可用于统计的唯一 POI。
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

function collapseNear<T extends DedupePoi>(bucket: T[], maxKm: number): T[] {
  // 在同一标识组内按名称优先级和距离判断重复项，只保留代表记录。
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
