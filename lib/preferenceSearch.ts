import { COMPARE_PREFERENCES } from "@/lib/types";

type SearchPreference = (typeof COMPARE_PREFERENCES)[number];

function norm(value: string) {
  return value.toLocaleLowerCase("en-AU").trim();
}

/** Match preference labels and searchTerms so typed priorities pop up from our list. */
export function findPreferences(
  query: string,
  excludeIds: string[] = [],
  catalogue: SearchPreference[] = COMPARE_PREFERENCES
) {
  const q = norm(query);
  const blocked = new Set(excludeIds);
  const pool = catalogue.filter((pref) => !blocked.has(pref.id));
  if (!q) return pool;

  return pool
    .map((pref) => {
      const label = norm(pref.label);
      const terms = pref.searchTerms.map(norm);
      let rank = 99;
      if (label === q || pref.id === q) rank = 0;
      else if (label.startsWith(q) || pref.id.startsWith(q)) rank = 1;
      else if (terms.some((term) => term === q)) rank = 2;
      else if (label.includes(q) || terms.some((term) => term.startsWith(q))) rank = 3;
      else if (terms.some((term) => term.includes(q))) rank = 4;
      return { pref, rank };
    })
    .filter((row) => row.rank < 99)
    .sort((a, b) => a.rank - b.rank || a.pref.label.localeCompare(b.pref.label, "en-AU"))
    .map((row) => row.pref);
}
