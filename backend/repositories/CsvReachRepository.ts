import type { Poi, ReachablePoi } from "@/lib/types";
import { CsvDatasetLoader } from "@/backend/data/CsvDatasetLoader";
import { RegionalPoiMapper } from "@/backend/mappers/RegionalPoiMapper";
import { EstimatedJourneyCalculator } from "@/backend/services/EstimatedJourneyCalculator";
import { SpatialGridIndex } from "@/backend/spatial/SpatialGridIndex";
import type {
  ReachComputation,
  ReachRepository,
  ReachSearchCriteria
} from "./ReachRepository";

type IndexedPoi = Poi;

/** Repository that answers map requests from the supplied Iteration 1 CSV files. */
export class CsvReachRepository implements ReachRepository {
  readonly dataSource = "csv" as const;

  private indexPromise: Promise<SpatialGridIndex<IndexedPoi>> | undefined;

  constructor(
    private readonly loader = new CsvDatasetLoader(),
    private readonly mapper = new RegionalPoiMapper(),
    private readonly journeyCalculator = new EstimatedJourneyCalculator()
  ) {}

  async findReachable(criteria: ReachSearchCriteria): Promise<ReachComputation> {
    const [dataset, index] = await Promise.all([this.loader.load(), this.getIndex()]);
    const searchRadiusKm = this.journeyCalculator.maximumOutboundDistanceKm(
      criteria.windowMinutes
    );
    const candidates = index.withinRadius(criteria.pin, searchRadiusKm);
    const reachable: ReachablePoi[] = [];
    let outboundOnlyCount = 0;

    for (const poi of candidates) {
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
          name: "Regional POI detail (Iteration 1)",
          date: dataset.metadata.sourceDate,
          note: `${dataset.metadata.poiCount.toLocaleString("en-AU")} supplied records with real coordinates; the map returns categories supported by the current UI.`
        },
        transit: {
          name: "Walking estimate (no GTFS supplied)",
          date: dataset.metadata.sourceDate,
          note: "Straight-line distance at 4.8 km/h. The supplied files do not contain routes, timetables, or observed travel times."
        }
      }
    };
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.loader.load();
      return true;
    } catch {
      return false;
    }
  }

  private getIndex(): Promise<SpatialGridIndex<IndexedPoi>> {
    if (!this.indexPromise) {
      this.indexPromise = this.loader.load().then((dataset) => {
        const mappedPois = dataset.pois
          .map((record) => this.mapper.toMapPoi(record))
          .filter((poi): poi is Poi => poi !== null);
        return new SpatialGridIndex(mappedPois);
      });
    }
    return this.indexPromise;
  }
}
