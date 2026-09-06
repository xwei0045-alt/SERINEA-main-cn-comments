import type { QueryResultRow } from "pg";
import type { Poi, ReachablePoi } from "@/lib/types";
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

/** Reads POIs directly from Lucian's deployed RDS table without changing the API shape. */
export class PostgresReachRepository implements ReachRepository {
  readonly dataSource = "database" as const;

  constructor(
    private readonly database: PostgresDatabase,
    private readonly mapper = new RegionalPoiMapper(),
    private readonly journeyCalculator = new EstimatedJourneyCalculator()
  ) {}

  async findReachable(criteria: ReachSearchCriteria): Promise<ReachComputation> {
    const searchRadiusKm = this.journeyCalculator.maximumOutboundDistanceKm(
      criteria.windowMinutes
    );
    const latitudeDelta = searchRadiusKm / 110.574;
    const longitudeScale = Math.max(
      0.01,
      Math.cos((criteria.pin.lat * Math.PI) / 180)
    );
    const longitudeDelta = searchRadiusKm / (111.32 * longitudeScale);
    // The bounding box lets PostgreSQL reduce the candidate set before the
    // existing walking-time calculation applies the product distance rule.
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
       WHERE latitude BETWEEN $1 AND $2
         AND longitude BETWEEN $3 AND $4
         AND subcategory = ANY($5::text[])`,
      [
        criteria.pin.lat - latitudeDelta,
        criteria.pin.lat + latitudeDelta,
        criteria.pin.lng - longitudeDelta,
        criteria.pin.lng + longitudeDelta,
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

  async isHealthy(): Promise<boolean> {
    try {
      await this.database.query("SELECT 1 FROM public.regional_pois LIMIT 1");
      return true;
    } catch {
      return false;
    }
  }

}
