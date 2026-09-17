import type { Poi } from "@/lib/types";
import type { PoiCategoryId } from "@/shared/contracts/reach";
import type { RegionalPoiRecord } from "@/backend/data/RegionalDataset";

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

export class RegionalPoiMapper {
  // 将数据库区域 POI 转换为地图契约；无法识别类别时返回 null 以跳过无效记录。
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

  // 作用：实现 readableName 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  private readableName(value: string): string {
    return value
      .split("_")
      .filter(Boolean)
      .map((word) => word[0]?.toUpperCase() + word.slice(1))
      .join(" ");
  }
}
