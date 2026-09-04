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
  | "park"
  | "grocery"
  | "gp"
  | "hospital"
  | "pharmacy"
  | "gym"
  | "school"
  | "library"
  | "community"
  | "transit"
  | "food"
  | "shops"
  | "museum";

export const CATEGORIES: { id: PoiCategory; label: string }[] = [
  { id: "park", label: "Park" },
  { id: "grocery", label: "Grocery" },
  { id: "gp", label: "Doctor" },
  { id: "hospital", label: "Hospital" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "gym", label: "Gym" },
  { id: "school", label: "School" },
  { id: "library", label: "Library" },
  { id: "community", label: "Community" },
  { id: "transit", label: "Transit" },
  { id: "food", label: "Food" },
  { id: "shops", label: "Shops" },
  { id: "museum", label: "Museum" }
];

/** Categories present in the Iteration 1 extract after CSV mapping. */
export const MAP_CATEGORIES: { id: PoiCategory; label: string }[] = [
  { id: "park", label: "Park" },
  { id: "grocery", label: "Grocery" },
  { id: "gp", label: "Doctor" },
  { id: "hospital", label: "Hospital" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "gym", label: "Gym" },
  { id: "school", label: "School" },
  { id: "library", label: "Library" },
  { id: "community", label: "Community" },
  { id: "transit", label: "Transit" }
];

/**
 * Preference chips for Compare. Each preference pulls one or more CSV subcategories.
 * Weights are applied when the user selects that preference.
 */
export const COMPARE_PREFERENCES: {
  id: string;
  label: string;
  subcategories: string[];
  /** Extra words people type when searching this dataset. */
  searchTerms: string[];
}[] = [
  {
    id: "park",
    label: "Parks",
    subcategories: ["park", "nature_reserve", "playground", "garden"],
    searchTerms: ["park", "parks", "nature", "reserve", "playground", "garden"]
  },
  {
    id: "grocery",
    label: "Grocery",
    subcategories: ["supermarket", "convenience_store"],
    searchTerms: ["grocery", "supermarket", "shop", "shops", "food store", "convenience"]
  },
  {
    id: "gp",
    label: "Doctor / clinic",
    subcategories: ["doctor", "clinic", "dentist"],
    searchTerms: [
      "doctor",
      "doctors",
      "gp",
      "clinic",
      "dentist",
      "medical",
      "psychologist",
      "psychology",
      "mental health"
    ]
  },
  {
    id: "hospital",
    label: "Hospital",
    subcategories: ["hospital"],
    searchTerms: ["hospital", "hospitals", "emergency"]
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    subcategories: ["pharmacy"],
    searchTerms: ["pharmacy", "pharmacies", "chemist", "chemists"]
  },
  {
    id: "school",
    label: "Schools",
    subcategories: ["school", "kindergarten", "college", "childcare"],
    searchTerms: ["school", "schools", "kindergarten", "college", "childcare", "education"]
  },
  {
    id: "gym",
    label: "Gym / sports",
    subcategories: ["sports_centre"],
    searchTerms: ["gym", "gyms", "sport", "sports", "fitness", "sports centre"]
  },
  {
    id: "library",
    label: "Library",
    subcategories: ["library"],
    searchTerms: ["library", "libraries"]
  },
  {
    id: "community",
    label: "Community",
    subcategories: ["community_centre", "town_hall", "social_facility"],
    searchTerms: ["community", "town hall", "social", "community centre"]
  },
  {
    id: "transit",
    label: "Transit",
    subcategories: [
      "bus_stop",
      "stop_position",
      "platform",
      "railway_station",
      "station",
      "bus_station",
      "railway_halt",
      "tram_stop"
    ],
    searchTerms: [
      "transit",
      "transport",
      "bus",
      "buses",
      "bus stop",
      "bus stops",
      "train",
      "trains",
      "railway",
      "station",
      "stations",
      "tram",
      "trams",
      "platform"
    ]
  }
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
