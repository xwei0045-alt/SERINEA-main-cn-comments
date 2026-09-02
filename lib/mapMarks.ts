import type { PoiCategory } from "./types";
import { CATEGORIES, MAP_CATEGORIES } from "./types";

export type MapMark = {
  letter: string;
  wide?: boolean;
};

/** Letter plus colour — never colour alone — so park / shop / clinic stay distinct. */
export const MAP_MARK: Record<PoiCategory, MapMark> = {
  park: { letter: "P" },
  grocery: { letter: "S" },
  gp: { letter: "+" },
  pharmacy: { letter: "Rx", wide: true },
  gym: { letter: "G" },
  food: { letter: "F" },
  shops: { letter: "S" },
  museum: { letter: "M" }
};

export function categoryLabel(id: PoiCategory): string {
  return (
    MAP_CATEGORIES.find((cat) => cat.id === id)?.label ??
    CATEGORIES.find((cat) => cat.id === id)?.label ??
    id
  );
}

export function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function poiMarkClass(category: PoiCategory, on = false): string {
  const mark = MAP_MARK[category];
  return [
    "poi-mark",
    `poi-mark--${category}`,
    mark.wide ? "poi-mark--wide" : "",
    on ? "is-on" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

export function poiMarkHtml(category: PoiCategory, on: boolean, title: string): string {
  const mark = MAP_MARK[category];
  return `<span class="${poiMarkClass(category, on)}" title="${escapeAttr(title)}">${mark.letter}</span>`;
}
