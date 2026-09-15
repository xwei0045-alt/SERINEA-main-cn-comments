import type { Poi } from "@/lib/types";
import type { PoiCategoryId } from "@/shared/contracts/reach";
import type { RegionalPoiRecord } from "@/backend/data/RegionalDataset";

/** Every Iteration 1 subcategory maps onto a labelled map type. */
const CATEGORY_BY_SUBCATEGORY: Record<string, PoiCategoryId> = {
  park: "park",
  nature_reserve: "park",
  playground: "park",
  garden: "park",
  sports_centre: "gym",
  supermarket: "grocery",
  convenience_store: "grocery",
  pharmacy: "pharmacy",
  doctor: "gp",
  clinic: "gp",
  dentist: "gp",
  hospital: "hospital",
  school: "school",
  kindergarten: "school",
  college: "school",
  childcare: "school",
  library: "library",
  community_centre: "community",
  town_hall: "community",
  social_facility: "community",
  bus_stop: "transit",
  stop_position: "transit",
  platform: "transit",
  railway_station: "transit",
  station: "transit",
  bus_station: "transit",
  railway_halt: "transit",
  tram_stop: "transit"
};

export const SUPPORTED_SUBCATEGORIES = Object.keys(CATEGORY_BY_SUBCATEGORY);

export type MappableRegionalPoi = Pick<
  RegionalPoiRecord,
  | "osmId"
  | "name"
  | "displayName"
  | "subcategory"
  | "latitude"
  | "longitude"
  | "locality"
>;

/** Maps every supplied subcategory. Falls back to a readable unknown bucket only if a new tag appears. */
export class RegionalPoiMapper {
  /** Converts a stored record into a map place. */
  toMapPoi(record: MappableRegionalPoi): Poi | null {
    const category = CATEGORY_BY_SUBCATEGORY[record.subcategory];
    if (!category) return null;

    return {
      id: record.osmId,
      name: record.name || record.displayName || this.readableName(record.subcategory),
      category,
      subcategory: record.subcategory,
      lat: record.latitude,
      lng: record.longitude,
      suburb: record.locality
    };
  }

  /** Handles the readable name step. */
  private readableName(value: string): string {
    return value
      .split("_")
      .filter(Boolean)
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      .join(" ");
  }
}
