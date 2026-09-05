import type { LocalitySummaryItem } from "@/shared/contracts/localities";

function norm(value: string) {
  return value.toLocaleLowerCase("en-AU").trim();
}

/** Rank town hits so exact and prefix names float to the top of the popup. */
export function rankLocalityMatches(
  items: LocalitySummaryItem[],
  query: string
): LocalitySummaryItem[] {
  const q = norm(query);
  if (!q) return items;

  return [...items].sort((a, b) => {
    const score = (item: LocalitySummaryItem) => {
      const locality = norm(item.locality);
      const lga = norm(item.lgaName);
      const region = norm(item.regionalGroup);
      if (locality === q) return 0;
      if (locality.startsWith(q)) return 1;
      if (lga === q || lga.startsWith(q)) return 2;
      if (locality.includes(q)) return 3;
      if (lga.includes(q) || region.includes(q)) return 4;
      return 5;
    };
    return (
      score(a) - score(b) ||
      b.totalPoiCount - a.totalPoiCount ||
      a.locality.localeCompare(b.locality, "en-AU")
    );
  });
}
