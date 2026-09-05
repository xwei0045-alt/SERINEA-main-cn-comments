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

/** Categories present in the Iteration 1 extract after CSV mapping (map legend / marks). */
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
 * Every facility type in the regional extract (CSV subcategory + display name).
 * Compare, home, and map filters use this list so people can search the real data.
 */
export const DATASET_FACILITIES: {
  id: string;
  label: string;
  subcategory: string;
  group: string;
  mapCategory: PoiCategory;
  searchTerms: string[];
}[] = [
  {
    id: "park",
    label: "Park",
    subcategory: "park",
    group: "Recreation",
    mapCategory: "park",
    searchTerms: ["park", "parks"]
  },
  {
    id: "nature_reserve",
    label: "Nature reserve",
    subcategory: "nature_reserve",
    group: "Recreation",
    mapCategory: "park",
    searchTerms: ["nature", "reserve", "nature reserve", "bush"]
  },
  {
    id: "playground",
    label: "Playground",
    subcategory: "playground",
    group: "Recreation",
    mapCategory: "park",
    searchTerms: ["playground", "play"]
  },
  {
    id: "garden",
    label: "Garden",
    subcategory: "garden",
    group: "Recreation",
    mapCategory: "park",
    searchTerms: ["garden", "gardens"]
  },
  {
    id: "sports_centre",
    label: "Sports centre",
    subcategory: "sports_centre",
    group: "Recreation",
    mapCategory: "gym",
    searchTerms: ["sports", "sport", "gym", "fitness", "sports centre", "pool"]
  },
  {
    id: "supermarket",
    label: "Supermarket",
    subcategory: "supermarket",
    group: "Shopping",
    mapCategory: "grocery",
    searchTerms: ["supermarket", "grocery", "iga", "coles", "woolworths"]
  },
  {
    id: "convenience_store",
    label: "Convenience store",
    subcategory: "convenience_store",
    group: "Shopping",
    mapCategory: "grocery",
    searchTerms: ["convenience", "store", "shop", "shops"]
  },
  {
    id: "doctor",
    label: "Doctor",
    subcategory: "doctor",
    group: "Healthcare",
    mapCategory: "gp",
    searchTerms: ["doctor", "doctors", "gp", "medical"]
  },
  {
    id: "clinic",
    label: "Clinic",
    subcategory: "clinic",
    group: "Healthcare",
    mapCategory: "gp",
    searchTerms: ["clinic", "clinics", "medical centre"]
  },
  {
    id: "dentist",
    label: "Dentist",
    subcategory: "dentist",
    group: "Healthcare",
    mapCategory: "gp",
    searchTerms: ["dentist", "dental"]
  },
  {
    id: "hospital",
    label: "Hospital",
    subcategory: "hospital",
    group: "Healthcare",
    mapCategory: "hospital",
    searchTerms: ["hospital", "hospitals", "emergency"]
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    subcategory: "pharmacy",
    group: "Healthcare",
    mapCategory: "pharmacy",
    searchTerms: ["pharmacy", "chemist", "chemists"]
  },
  {
    id: "school",
    label: "School",
    subcategory: "school",
    group: "Education",
    mapCategory: "school",
    searchTerms: ["school", "schools", "education"]
  },
  {
    id: "kindergarten",
    label: "Kindergarten",
    subcategory: "kindergarten",
    group: "Education",
    mapCategory: "school",
    searchTerms: ["kindergarten", "kinder", "preschool"]
  },
  {
    id: "college",
    label: "College",
    subcategory: "college",
    group: "Education",
    mapCategory: "school",
    searchTerms: ["college", "tafe", "uni", "university"]
  },
  {
    id: "childcare",
    label: "Childcare",
    subcategory: "childcare",
    group: "Education",
    mapCategory: "school",
    searchTerms: ["childcare", "child care", "daycare", "day care"]
  },
  {
    id: "library",
    label: "Library",
    subcategory: "library",
    group: "Community",
    mapCategory: "library",
    searchTerms: ["library", "libraries"]
  },
  {
    id: "community_centre",
    label: "Community centre",
    subcategory: "community_centre",
    group: "Community",
    mapCategory: "community",
    searchTerms: ["community", "community centre", "hall"]
  },
  {
    id: "town_hall",
    label: "Town hall",
    subcategory: "town_hall",
    group: "Community",
    mapCategory: "community",
    searchTerms: ["town hall", "council"]
  },
  {
    id: "social_facility",
    label: "Social facility",
    subcategory: "social_facility",
    group: "Community",
    mapCategory: "community",
    searchTerms: ["social", "social facility", "aged care"]
  },
  {
    id: "bus_stop",
    label: "Bus stop",
    subcategory: "bus_stop",
    group: "Public transport",
    mapCategory: "transit",
    searchTerms: ["bus", "buses", "bus stop", "bus stops", "transit", "transport"]
  },
  {
    id: "bus_station",
    label: "Bus station",
    subcategory: "bus_station",
    group: "Public transport",
    mapCategory: "transit",
    searchTerms: ["bus station", "bus stations", "coach"]
  },
  {
    id: "railway_station",
    label: "Railway station",
    subcategory: "railway_station",
    group: "Public transport",
    mapCategory: "transit",
    searchTerms: ["train", "trains", "railway", "railway station", "station"]
  },
  {
    id: "railway_halt",
    label: "Railway halt",
    subcategory: "railway_halt",
    group: "Public transport",
    mapCategory: "transit",
    searchTerms: ["halt", "railway halt"]
  },
  {
    id: "tram_stop",
    label: "Tram stop",
    subcategory: "tram_stop",
    group: "Public transport",
    mapCategory: "transit",
    searchTerms: ["tram", "trams", "tram stop"]
  },
  {
    id: "platform",
    label: "Public transport platform",
    subcategory: "platform",
    group: "Public transport",
    mapCategory: "transit",
    searchTerms: ["platform", "platforms"]
  },
  {
    id: "station",
    label: "Public transport station",
    subcategory: "station",
    group: "Public transport",
    mapCategory: "transit",
    searchTerms: ["station", "stations", "pt station"]
  },
  {
    id: "stop_position",
    label: "Public transport stop",
    subcategory: "stop_position",
    group: "Public transport",
    mapCategory: "transit",
    searchTerms: ["stop", "stops", "stop position"]
  }
];

/**
 * Preference chips for Compare / home. One entry per extract subcategory
 * so people can rank on bus stations, parks, pharmacies, etc. separately.
 */
export const COMPARE_PREFERENCES: {
  id: string;
  label: string;
  subcategories: string[];
  searchTerms: string[];
}[] = DATASET_FACILITIES.map((facility) => ({
  id: facility.id,
  label: facility.label,
  subcategories: [facility.subcategory],
  searchTerms: [...facility.searchTerms, facility.group.toLocaleLowerCase("en-AU")]
}));

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
  /** Exact extract subcategory (bus_stop, railway_station, …). */
  subcategory?: string;
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
