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

const facilitiesByGroup = (group: string) =>
  DATASET_FACILITIES
    .filter((facility) => facility.group === group)
    .map((facility) => facility.subcategory);

/**
 * The assistant can rank exact extract rows, broad category totals, and the two
 * explicitly documented name-based proxies. Compare keeps its existing chip list.
 */
export const RANKING_PREFERENCES: {
  id: string;
  label: string;
  subcategories: string[];
  searchTerms: string[];
  evidenceMethod: "exact_subcategory" | "category_total" | "name_heuristic";
  warning?: string;
}[] = [
  ...COMPARE_PREFERENCES.map((preference) => ({
    ...preference,
    evidenceMethod: "exact_subcategory" as const
  })),
  ...[
    ["community", "Community services", "Community"],
    ["education", "Education services", "Education"],
    ["healthcare", "Healthcare", "Healthcare"],
    ["public_transport", "Public transport", "Public transport"],
    ["recreation", "Recreation facilities", "Recreation"],
    ["shopping", "Shopping facilities", "Shopping"]
  ].map(([id, label, group]) => ({
    id,
    label,
    subcategories: facilitiesByGroup(group),
    searchTerms: [label.toLocaleLowerCase("en-AU")],
    evidenceMethod: "category_total" as const
  })),
  {
    id: "primary_school",
    label: "Name-identified primary school",
    subcategories: ["primary_school"],
    searchTerms: ["primary school", "elementary school"],
    evidenceMethod: "name_heuristic",
    warning:
      "Identified from school names containing ‘Primary’. Coverage may be incomplete; zero records does not prove absence."
  },
  {
    id: "gym",
    label: "Name-identified gym or fitness centre",
    subcategories: ["gym"],
    searchTerms: ["gym", "fitness centre", "fitness center"],
    evidenceMethod: "name_heuristic",
    warning:
      "Identified from sports-centre names containing ‘gym’ or ‘fitness’. Coverage may be incomplete; zero records does not prove absence."
  }
];

/**
 * User-facing hierarchy for Compare. A broad parent uses the existing
 * category-total preference; its children use exact rows or a disclosed name
 * heuristic. The UI keeps a parent and its children mutually exclusive so the
 * same facility records are never weighted twice.
 */
export const COMPARE_PREFERENCE_GROUPS = [
  {
    id: "education",
    label: "Education",
    description: "Schools, early learning and further study",
    preferenceId: "education",
    childIds: ["school", "primary_school", "kindergarten", "childcare", "college"]
  },
  {
    id: "healthcare",
    label: "Healthcare",
    description: "Everyday care, medicines and hospitals",
    preferenceId: "healthcare",
    childIds: ["doctor", "clinic", "dentist", "hospital", "pharmacy"]
  },
  {
    id: "shopping",
    label: "Shopping & essentials",
    description: "Groceries and everyday convenience",
    preferenceId: "shopping",
    childIds: ["supermarket", "convenience_store"]
  },
  {
    id: "community",
    label: "Community life",
    description: "Libraries, halls and community facilities",
    preferenceId: "community",
    childIds: ["library", "community_centre", "town_hall", "social_facility"]
  },
  {
    id: "recreation",
    label: "Parks & recreation",
    description: "Green spaces, play and sport",
    preferenceId: "recreation",
    childIds: ["park", "nature_reserve", "playground", "garden", "sports_centre", "gym"]
  },
  {
    id: "public_transport",
    label: "Public transport",
    description: "Bus, rail and tram infrastructure",
    preferenceId: "public_transport",
    childIds: [
      "bus_stop",
      "bus_station",
      "railway_station",
      "railway_halt",
      "tram_stop",
      "platform",
      "station",
      "stop_position"
    ]
  }
] as const;

const compareHierarchyIds: Set<string> = new Set(
  COMPARE_PREFERENCE_GROUPS.flatMap((group) => [group.preferenceId, ...group.childIds])
);

export const COMPARE_HIERARCHY_PREFERENCES = RANKING_PREFERENCES.filter((preference) =>
  compareHierarchyIds.has(preference.id)
);

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
