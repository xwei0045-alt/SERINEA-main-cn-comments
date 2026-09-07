import { Environment } from "@/backend/config/Environment";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import type { RegionalPoiRecord } from "@/backend/data/RegionalDataset";

export type ComparePoi = Pick<RegionalPoiRecord,
  "osmId" | "name" | "locality" | "lgaName" | "regionalGroup" |
  "subcategory" | "displayName" | "latitude" | "longitude">;

/** Loads the same production POIs as town search for ranking deduplication and pins. */
export class PostgresComparePoiLoader {
  constructor(private readonly database = PostgresDatabase.getInstance(
    Environment.getInstance().databaseUrl as string
  )) {}

  async load(): Promise<{ pois: ComparePoi[] }> {
    const result = await this.database.query<ComparePoi>(`SELECT
      osm_id::text AS "osmId", COALESCE(name, '') AS name, locality,
      COALESCE(lga_name, '') AS "lgaName",
      COALESCE(regional_group, '') AS "regionalGroup",
      COALESCE(subcategory, 'unknown') AS subcategory,
      COALESCE(NULLIF(display_name, ''), subcategory, 'Unknown') AS "displayName",
      latitude, longitude
      FROM public.regional_pois
      WHERE NULLIF(TRIM(locality), '') IS NOT NULL`);
    return { pois: result.rows.map(row => {
      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      if (row.latitude == null || row.longitude == null ||
          !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        throw new Error("The ranking dataset contains invalid POI coordinates.");
      }
      return { ...row, latitude, longitude };
    }) };
  }
}
