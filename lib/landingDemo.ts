/** Homepage atlas only — a regional town, not live routing. */

export type DemoPin = {
  id: string;
  label: string;
  kind: string;
  minutes: number;
  x: number; // % across atlas
  y: number; // % down atlas
  keep: boolean;
};

export type DemoArea = {
  id: string;
  name: string;
  line: string;
  scoreLabel: string;
  scoreNote: string;
  tags: string[];
};

export type DemoStep = {
  n: string;
  title: string;
  body: string;
};

/**
 * Fifteen demo places for the scroll reel, matching map categories.
 * Minutes are unique (1–15). keep:false = outbound fits but return fails.
 */
export const DEMO_PINS: DemoPin[] = [
  { id: "groc-near", label: "Town IGA", kind: "Grocery", minutes: 5, x: 50.0, y: 24.0, keep: true },
  { id: "gp", label: "Town GP", kind: "GP", minutes: 6, x: 61.0, y: 25.0, keep: true },
  { id: "chem", label: "High St chemist", kind: "Pharmacy", minutes: 7, x: 71.5, y: 30.5, keep: true },
  { id: "oval", label: "Town oval", kind: "Park", minutes: 15, x: 86.0, y: 36.5, keep: true },
  { id: "far-hosp", label: "Next-town hospital", kind: "GP", minutes: 1, x: 72.0, y: 52.5, keep: false },
  { id: "groc", label: "Town grocery", kind: "Grocery", minutes: 9, x: 78.0, y: 65.5, keep: true },
  { id: "chem-night", label: "Night chemist", kind: "Pharmacy", minutes: 4, x: 64.5, y: 69.5, keep: true },
  { id: "gym", label: "Rec centre gym", kind: "Gym", minutes: 11, x: 58.0, y: 84.0, keep: true },
  { id: "far-gym", label: "Highway gym", kind: "Gym", minutes: 3, x: 44.0, y: 74.5, keep: false },
  { id: "river", label: "River park", kind: "Park", minutes: 12, x: 28.5, y: 80.0, keep: true },
  { id: "reserve", label: "Recreation reserve", kind: "Park", minutes: 14, x: 16.0, y: 70.0, keep: true },
  { id: "clinic", label: "Community clinic", kind: "GP", minutes: 13, x: 14.0, y: 54.0, keep: true },
  { id: "dental", label: "Dental clinic", kind: "GP", minutes: 10, x: 18.0, y: 40.0, keep: true },
  { id: "sports", label: "Sports centre", kind: "Gym", minutes: 8, x: 27.0, y: 29.5, keep: true },
  { id: "far-groc", label: "Next-town supermarket", kind: "Grocery", minutes: 2, x: 38.5, y: 28.0, keep: false }
];

export const DEMO_AREAS: DemoArea[] = [
  {
    id: "town",
    name: "Shepparton",
    line: "Iteration 1 opening pin · walking estimate",
    scoreLabel: "Regional",
    scoreNote: "Round-trip reach — not a ranking",
    tags: ["GP", "Pharmacy", "Grocery", "Park"]
  },
  {
    id: "ridge",
    name: "Mildura",
    line: "Regional extract · OSM places",
    scoreLabel: "Regional",
    scoreNote: "Services thin — open the map",
    tags: ["Grocery", "Gym", "Park"]
  },
  {
    id: "valley",
    name: "Wodonga",
    line: "Regional extract · return filter",
    scoreLabel: "Regional",
    scoreNote: "Return filter may drop outbound-only places",
    tags: ["GP", "Pharmacy", "Park"]
  }
];

export const DEMO_STEPS: DemoStep[] = [
  {
    n: "01",
    title: "Drop a pin",
    body: "Start in a regional town — Shepparton if you do not share a location. Inner Melbourne is not in this extract."
  },
  {
    n: "02",
    title: "See fifteen minutes",
    body: "Only parks, groceries, GPs, pharmacies and gyms you can walk to and get back from in a hard fifteen-minute window."
  },
  {
    n: "03",
    title: "Read the journey",
    body: "Every result shows legs, minutes, and the source date. Times are walking estimates until GTFS is added."
  }
];
