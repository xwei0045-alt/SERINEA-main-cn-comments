import type { Poi } from "@/lib/types";
import type { PoiCategoryId } from "@/shared/contracts/reach";
import type { RegionalPoiRecord } from "@/backend/data/RegionalDataset";

const CATEGORY_BY_SUBCATEGORY: Partial<Record<string, PoiCategoryId>> = {
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
  hospital: "gp",
  dentist: "gp"
};

/** Converts a data-team row into the smaller POI shape already used by the map. */
export class RegionalPoiMapper {
  toMapPoi(record: RegionalPoiRecord): Poi | null {
    const category = CATEGORY_BY_SUBCATEGORY[record.subcategory];
    if (!category) return null;

    return {
      id: record.osmId,
      name: record.name || record.displayName || this.readableName(record.subcategory),
      category,
      lat: record.latitude,
      lng: record.longitude,
      suburb: record.locality
    };
  }

  private readableName(value: string): string {
    return value
      .split("_")
      .filter(Boolean)
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      .join(" ");
  }
}
