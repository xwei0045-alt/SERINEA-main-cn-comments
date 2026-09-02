/** Demonstration landing data only — not live GTFS, OSM, or government sources. */

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
 * Fifteen demo places for the scroll reel.
 * Minutes are unique (1–15). Health needs first, then daily life.
 * keep:false = outbound fits but return fails (round-trip filter drops them).
 * Laid out clockwise from YOU (50,50) at even angles (~24°) so spokes never
 * share a ray; radius scales with minutes (nearer places sit closer in).
 */
export const DEMO_PINS: DemoPin[] = [
  { id: "coffee", label: "Main St cafe", kind: "Coffee", minutes: 5, x: 50.0, y: 24.0, keep: true },
  { id: "gp", label: "Town GP", kind: "GP", minutes: 6, x: 61.0, y: 25.0, keep: true },
  { id: "chem", label: "High St chemist", kind: "Pharmacy", minutes: 7, x: 71.5, y: 30.5, keep: true },
  { id: "lib", label: "Town library", kind: "Library", minutes: 15, x: 86.0, y: 36.5, keep: true },
  { id: "servo", label: "Highway servo", kind: "Fuel", minutes: 1, x: 72.0, y: 52.5, keep: false },
  { id: "groc", label: "Town grocery", kind: "Grocery", minutes: 9, x: 78.0, y: 65.5, keep: true },
  { id: "post", label: "Post office", kind: "Post", minutes: 4, x: 64.5, y: 69.5, keep: true },
  { id: "gym", label: "Rec centre gym", kind: "Gym", minutes: 11, x: 58.0, y: 84.0, keep: true },
  { id: "cinema", label: "RSL cinema", kind: "Cinema", minutes: 3, x: 44.0, y: 74.5, keep: false },
  { id: "shop", label: "Local shops", kind: "Shops", minutes: 12, x: 28.5, y: 80.0, keep: true },
  { id: "park", label: "Recreation oval", kind: "Park", minutes: 14, x: 16.0, y: 70.0, keep: true },
  { id: "school", label: "District school", kind: "School", minutes: 13, x: 14.0, y: 54.0, keep: true },
  { id: "dent", label: "Dental rooms", kind: "Dentist", minutes: 10, x: 18.0, y: 40.0, keep: true },
  { id: "clinic", label: "Community clinic", kind: "Health", minutes: 8, x: 27.0, y: 29.5, keep: true },
  { id: "mall", label: "Next-town centre", kind: "Shopping", minutes: 2, x: 38.5, y: 28.0, keep: false }
];

export const DEMO_AREAS: DemoArea[] = [
  {
    id: "town",
    name: "Sample rural town",
    line: "Demonstration pin · not live GTFS",
    scoreLabel: "Concept",
    scoreNote: "Round-trip reach preview — not a ranking",
    tags: ["GP", "Pharmacy", "Grocery", "Park"]
  },
  {
    id: "ridge",
    name: "Ridge settlement",
    line: "Demo catchment · sparse PT",
    scoreLabel: "Concept",
    scoreNote: "Services thin — open the map",
    tags: ["Grocery", "Gym", "Coffee"]
  },
  {
    id: "valley",
    name: "Valley stop",
    line: "Demo catchment · not live GTFS",
    scoreLabel: "Concept",
    scoreNote: "Return filter may drop outbound-only places",
    tags: ["GP", "School", "Park"]
  }
];

export const DEMO_STEPS: DemoStep[] = [
  {
    n: "01",
    title: "Drop a pin",
    body: "Start from your town — or where you might live. Default is a labelled demo pin if location is denied."
  },
  {
    n: "02",
    title: "See fifteen minutes",
    body: "Only places you can reach and get back from on public transport in a hard fifteen-minute window."
  },
  {
    n: "03",
    title: "Read the journey",
    body: "Every result shows legs, minutes, and the source it would come from — with the date. Demonstration until live GTFS."
  }
];
