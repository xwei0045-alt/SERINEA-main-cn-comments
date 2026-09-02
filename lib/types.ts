export const WINDOW_MINUTES = 15;

// Opening pin. Shepparton has mapped places in the extract. Melbourne does not.
export const REGIONAL_DEFAULT = {
  lat: -36.378248,
  lng: 145.40295,
  locality: "SHEPPARTON",
  label: "Shepparton"
} as const;

export const TOWN_JUMPS = [
  { label: "Shepparton", lat: -36.378248, lng: 145.40295 },
  { label: "Bendigo", lat: -36.75787, lng: 144.281138 },
  { label: "Mildura", lat: -34.195496, lng: 142.146155 },
  { label: "Wodonga", lat: -36.131367, lng: 146.883574 },
  { label: "Warrnambool", lat: -38.375168, lng: 142.48724 },
  { label: "Traralgon", lat: -38.194751, lng: 146.533288 }
] as const;

export type PoiCategory =
  | "food"
  | "shops"
  | "gym"
  | "grocery"
  | "gp"
  | "pharmacy"
  | "park"
  | "museum";

export const CATEGORIES: { id: PoiCategory; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "shops", label: "Shops" },
  { id: "gym", label: "Gym" },
  { id: "grocery", label: "Grocery" },
  { id: "gp", label: "Doctor" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "park", label: "Park" },
  { id: "museum", label: "Museum" }
];

/** Categories present in the Iteration 1 extract after CSV mapping. */
export const MAP_CATEGORIES: { id: PoiCategory; label: string }[] = [
  { id: "park", label: "Park" },
  { id: "grocery", label: "Grocery" },
  { id: "gp", label: "Doctor" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "gym", label: "Gym" }
];

export type Mode = "walk" | "tram" | "train" | "bus";

export type LatLng = { lat: number; lng: number };

export type Stop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  mode: Exclude<Mode, "walk">;
  routes: string[];
  /** Routes that are slower or missing in the reverse direction. */
  oneWay?: boolean;
};

export type Poi = {
  id: string;
  name: string;
  category: PoiCategory;
  lat: number;
  lng: number;
  suburb: string;
};

export type Leg = {
  mode: Mode;
  minutes: number;
  text: string;
};

export type Journey = {
  outbound: Leg[];
  inbound: Leg[];
  outboundMinutes: number;
  inboundMinutes: number;
  roundTripMinutes: number;
};

export type ReachablePoi = {
  poi: Poi;
  journey: Journey;
};

export type WaterKind = "bay" | "lake" | "harbour" | null;

export type PinState = LatLng & {
  water: WaterKind;
  locationDenied: boolean;
  locationFailed: boolean;
};

export type SourceStamp = {
  name: string;
  date: string;
  note: string;
};
