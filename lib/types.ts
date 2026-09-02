export const WINDOW_MINUTES = 15;

export const MELBOURNE_DEFAULT = {
  lat: -37.8183,
  lng: 144.9671,
  label: "Flinders Street Station, Melbourne"
} as const;

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
  { id: "gp", label: "GP" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "park", label: "Park" },
  { id: "museum", label: "Museum" }
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
