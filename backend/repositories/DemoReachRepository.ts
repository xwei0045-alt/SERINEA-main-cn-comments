import { isochroneFrom, reachFrom } from "@/lib/reach";
import { GTFS_SOURCE, OSM_SOURCE } from "@/lib/sources";
import type {
  ReachComputation,
  ReachRepository,
  ReachSearchCriteria
} from "./ReachRepository";

/**
 * Repository backed by the existing static demonstration files.
 * It keeps the complete API usable while the real database files are unavailable.
 */
export class DemoReachRepository implements ReachRepository {
  readonly dataSource = "demo" as const;

  /** Runs the existing approximation on the server instead of inside the browser. */
  async findReachable(criteria: ReachSearchCriteria): Promise<ReachComputation> {
    const result = reachFrom(criteria.pin, criteria.windowMinutes);

    return {
      ...result,
      hull: isochroneFrom(criteria.pin, criteria.windowMinutes),
      sources: {
        poi: OSM_SOURCE,
        transit: GTFS_SOURCE
      }
    };
  }

  /** Static files are available whenever the application has started successfully. */
  async isHealthy(): Promise<boolean> {
    return true;
  }
}
