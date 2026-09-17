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

export class PostgresLocalitySummaryRepository
  implements LocalitySummaryRepository
{
  readonly dataSource = "database" as const;

  // 注入共享数据库连接池，城镇摘要通过 SQL 聚合 POI 得到。
  constructor(private readonly database: PostgresDatabase) {}

  // 读取并聚合城镇、LGA、区域和设施子类别计数，返回比较页使用的摘要数据。
  async load(): Promise<LocalitySummaryData> {
    const [rowsResult, countResult, centroidResult] = await Promise.all([
      this.database.query<SummaryRow>(
        `SELECT
           locality,
           COALESCE(lga_name, '') AS "lgaName",
           COALESCE(abs_lga_code, '') AS "absLgaCode",
           COALESCE(regional_group, '') AS "regionalGroup",
           COALESCE(category, 'unknown') AS category,
           COALESCE(subcategory, 'unknown') AS subcategory,
           COALESCE(NULLIF(display_name, ''), subcategory, 'Unknown') AS "displayName",
           // 作用：实现 COUNT 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
           COUNT(*)::int AS "poiCount"
         FROM public.regional_pois
         WHERE NULLIF(TRIM(locality), '') IS NOT NULL
         GROUP BY locality, lga_name, abs_lga_code, regional_group, category, subcategory, display_name`
      ),
      this.database.query<DatasetCountRow>(
        `SELECT COUNT(*)::int AS "totalPois" FROM public.regional_pois`
      ),
      this.database.query<CentroidRow>(
        `SELECT
           poi.locality,
           poi.lga_name AS "lgaName",
           poi.regional_group AS "regionalGroup",
           AVG(poi.latitude) AS latitude,
           AVG(poi.longitude) AS longitude
         FROM public.regional_pois poi
         WHERE NULLIF(TRIM(poi.locality), '') IS NOT NULL
         GROUP BY poi.locality, poi.lga_name, poi.regional_group`
      )
    ]);
    const count = countResult.rows[0];
    if (!count) throw new Error("The regional POI count is unavailable.");

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
