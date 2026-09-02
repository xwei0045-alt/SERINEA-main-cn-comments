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

type ActiveDatasetRow = QueryResultRow & {
  version: string;
  detailFileName: string;
  sourceDate: string;
  poiCount: number;
};

/** Reads the active imported dataset from PostgreSQL without changing the API shape. */
export class PostgresReachRepository implements ReachRepository {
  readonly dataSource = "database" as const;

  constructor(
    private readonly database: PostgresDatabase,
    private readonly mapper = new RegionalPoiMapper(),
    private readonly journeyCalculator = new EstimatedJourneyCalculator()
  ) {}

  async findReachable(criteria: ReachSearchCriteria): Promise<ReachComputation> {
    const dataset = await this.getActiveDataset();
    const searchRadiusKm = this.journeyCalculator.maximumOutboundDistanceKm(
      criteria.windowMinutes
    );
    const latitudeDelta = searchRadiusKm / 110.574;
    const longitudeScale = Math.max(
      0.01,
      Math.cos((criteria.pin.lat * Math.PI) / 180)
    );
    const longitudeDelta = searchRadiusKm / (111.32 * longitudeScale);
    const result = await this.database.query<DatabasePoiRow>(
      `SELECT
         osm_id AS "osmId",
         name,
         display_name AS "displayName",
         subcategory,
         latitude,
         longitude,
         locality
       FROM regional_pois
       WHERE dataset_version = $1
         AND latitude BETWEEN $2 AND $3
         AND longitude BETWEEN $4 AND $5
         AND subcategory = ANY($6::text[])`,
      [
        dataset.version,
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
      if (journey.roundTripMinutes <= criteria.windowMinutes) {
        reachable.push({ poi, journey });
      } else if (journey.outboundMinutes <= criteria.windowMinutes) {
        outboundOnlyCount += 1;
      }
    }

    return {
      reachable,
      outboundOnlyCount,
      water: null,
      hull: this.journeyCalculator.createRoundTripHull(
        criteria.pin,
        criteria.windowMinutes
      ),
      sources: {
        poi: {
          name: `PostgreSQL: ${dataset.detailFileName}`,
          date: dataset.sourceDate,
          note: `${Number(dataset.poiCount).toLocaleString("en-AU")} records in active dataset ${dataset.version}.`
        },
        transit: {
          name: "Walking estimate (no GTFS supplied)",
          date: dataset.sourceDate,
          note: "Straight-line distance at 4.8 km/h. The supplied files do not contain routes, timetables, or observed travel times."
        }
      }
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.getActiveDataset();
      return true;
    } catch {
      return false;
    }
  }

  private async getActiveDataset(): Promise<ActiveDatasetRow> {
    const result = await this.database.query<ActiveDatasetRow>(
      `SELECT
         version,
         detail_file_name AS "detailFileName",
         source_date::text AS "sourceDate",
         poi_count AS "poiCount"
       FROM dataset_versions
       WHERE active = TRUE AND status = 'ready'
       LIMIT 1`
    );
    const dataset = result.rows[0];
    if (!dataset) throw new Error("No ready database dataset is active.");
    return dataset;
  }
}
