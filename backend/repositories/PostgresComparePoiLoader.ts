import { Environment } from "@/backend/config/Environment";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import type { RegionalPoiRecord } from "@/backend/data/RegionalDataset";

export type ComparePoi = Pick<RegionalPoiRecord,
  "osmId" | "name" | "locality" | "lgaName" | "regionalGroup" |
  "subcategory" | "displayName" | "latitude" | "longitude">;

export class PostgresComparePoiLoader {
  // 使用共享数据库实例，避免比较请求重复创建连接池。
  constructor(private readonly database = PostgresDatabase.getInstance(
    Environment.getInstance().databaseUrl as string
  )) {}

  // 读取比较所需的 POI 字段，过滤无效坐标后交给 CompareService 去重和统计。
  async load(): Promise<{ pois: ComparePoi[] }> {
    const result = await this.database.query<ComparePoi>(`SELECT
      osm_id::text AS "osmId", COALESCE(name, '') AS name, locality,
      COALESCE(lga_name, '') AS "lgaName",
      COALESCE(regional_group, '') AS "regionalGroup",
      COALESCE(subcategory, 'unknown') AS subcategory,
      COALESCE(NULLIF(display_name, ''), subcategory, 'Unknown') AS "displayName",
      latitude, longitude
      FROM public.regional_pois
      WHERE NULLIF(TRIM(locality), '') IS NOT NULL
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND latitude BETWEEN -90 AND 90
        AND longitude BETWEEN -180 AND 180`);

    const pois: ComparePoi[] = [];
    for (const row of result.rows) {
      if (row.latitude == null || row.longitude == null) continue;
      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
      if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
      pois.push({ ...row, latitude, longitude });
    }
    return { pois };
  }
}
