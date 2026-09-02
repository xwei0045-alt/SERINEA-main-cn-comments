import type { QueryResultRow } from "pg";
import type { LocalityPoiSummaryRecord } from "@/backend/data/RegionalDataset";
import type { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import type {
  LocalitySummaryData,
  LocalitySummaryRepository
} from "./LocalitySummaryRepository";

type SummaryRow = QueryResultRow & LocalityPoiSummaryRecord;
type DatasetCountRow = QueryResultRow & { totalPois: number };
type CentroidRow = QueryResultRow & {
  locality: string;
  lgaName: string;
  regionalGroup: string;
  latitude: number;
  longitude: number;
};

/** Reads locality summaries from the currently active database dataset. */
export class PostgresLocalitySummaryRepository
  implements LocalitySummaryRepository
{
  readonly dataSource = "database" as const;

  constructor(private readonly database: PostgresDatabase) {}

  async load(): Promise<LocalitySummaryData> {
    const [rowsResult, countResult, centroidResult] = await Promise.all([
      this.database.query<SummaryRow>(
        `SELECT
           summary.locality,
           summary.lga_name AS "lgaName",
           summary.abs_lga_code AS "absLgaCode",
           summary.regional_group AS "regionalGroup",
           summary.category,
           summary.subcategory,
           summary.display_name AS "displayName",
           summary.poi_count AS "poiCount"
         FROM locality_poi_summaries summary
         INNER JOIN dataset_versions dataset
           ON dataset.version = summary.dataset_version
         WHERE dataset.active = TRUE AND dataset.status = 'ready'`
      ),
      this.database.query<DatasetCountRow>(
        `SELECT summary_poi_count AS "totalPois"
         FROM dataset_versions
         WHERE active = TRUE AND status = 'ready'
         LIMIT 1`
      ),
      this.database.query<CentroidRow>(
        `SELECT
           poi.locality,
           poi.lga_name AS "lgaName",
           poi.regional_group AS "regionalGroup",
           AVG(poi.latitude) AS latitude,
           AVG(poi.longitude) AS longitude
         FROM regional_pois poi
         INNER JOIN dataset_versions dataset
           ON dataset.version = poi.dataset_version
         WHERE dataset.active = TRUE AND dataset.status = 'ready'
         GROUP BY poi.locality, poi.lga_name, poi.regional_group`
      )
    ]);
    const count = countResult.rows[0];
    if (!count) throw new Error("No ready database dataset is active.");

    return {
      rows: rowsResult.rows.map((row) => ({
        ...row,
        poiCount: Number(row.poiCount)
      })),
      totalPois: Number(count.totalPois),
      centroids: centroidResult.rows.map((row) => ({
        locality: row.locality,
        lgaName: row.lgaName,
        regionalGroup: row.regionalGroup,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude)
      }))
    };
  }
}
