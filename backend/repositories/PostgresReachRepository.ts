import type { QueryResultRow } from "pg";
import type { ReachablePoi } from "@/lib/types";
import type { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import {
  RegionalPoiMapper,
  SUPPORTED_SUBCATEGORIES
} from "@/backend/mappers/RegionalPoiMapper";
import { EstimatedJourneyCalculator } from "@/backend/services/EstimatedJourneyCalculator";
import type {
  ReachComputation,
  ReachRepository,
  ReachSearchCriteria
} from "./ReachRepository";

type DatabasePoiRow = QueryResultRow & {
  osmId: string;
  name: string;
  displayName: string;
  subcategory: string;
  latitude: number;
  longitude: number;
  locality: string;
};

export class PostgresReachRepository implements ReachRepository {
  readonly dataSource = "database" as const;

  // 保存数据库和地图数据映射依赖，查询时复用同一个连接池。
  constructor(
    private readonly database: PostgresDatabase,
    private readonly mapper = new RegionalPoiMapper(),
    private readonly journeyCalculator = new EstimatedJourneyCalculator()
  ) {}

  // 用 PostGIS 按定位点读取候选 POI，再计算步行估算并组成可达性响应。
  async findReachable(criteria: ReachSearchCriteria): Promise<ReachComputation> {
    const searchRadiusKm = this.journeyCalculator.maximumOutboundDistanceKm(
      criteria.windowMinutes
    );
    const searchRadiusMetres = searchRadiusKm * 1_000;
    const result = await this.database.query<DatabasePoiRow>(
      `SELECT
         osm_id AS "osmId",
         name,
         display_name AS "displayName",
         subcategory,
         latitude,
         longitude,
         locality
       FROM public.regional_pois
       WHERE ST_DWithin(
         location,
         ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
         $3
       )
         AND subcategory = ANY($4::text[])`,
      [
        criteria.pin.lng,
        criteria.pin.lat,
        searchRadiusMetres,
        SUPPORTED_SUBCATEGORIES
      ]
    );
    const reachable: ReachablePoi[] = [];
    let outboundOnlyCount = 0;

    for (const row of result.rows) {
      const poi = this.mapper.toMapPoi(row);
      if (!poi) continue;
      const journey = this.journeyCalculator.createWalkingJourney(criteria.pin, poi);
      if (journey.outboundMinutes <= criteria.windowMinutes) {
        reachable.push({ poi, journey });
      }
    }

    return {
      reachable,
      outboundOnlyCount,
      water: null,
      hull: this.journeyCalculator.createReachHull(
        criteria.pin,
        criteria.windowMinutes
      ),
      sources: {
        poi: {
          name: "AWS RDS: public.regional_pois",
          date: "Live database query",
          note: "POIs are read directly from the deployed PostgreSQL and PostGIS dataset."
        },
        transit: {
          name: "Walking estimate (no GTFS supplied)",
          date: "Live database query",
          note: "Straight-line distance at 4.8 km/h. The database does not contain routes, timetables, or observed travel times."
        }
      }
    };
  }

  // 检查可达性所需的 PostgreSQL 数据表是否可以读取。
  async isHealthy(): Promise<boolean> {
    try {
      await this.database.query("SELECT 1 FROM public.regional_pois LIMIT 1");
      return true;
    } catch {
      return false;
    }
  }

}
