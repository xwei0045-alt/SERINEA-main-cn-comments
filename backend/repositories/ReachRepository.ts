import type { LatLng, ReachablePoi, SourceStamp, WaterKind } from "@/lib/types";
import type { ReachResponse } from "@/shared/contracts/reach";

/** Values a repository needs to calculate reachability from one map pin. */
export type ReachSearchCriteria = {
  pin: LatLng;
  windowMinutes: number;
};

/** Raw calculation returned by any current or future data source. */
export type ReachComputation = {
  reachable: ReachablePoi[];
  outboundOnlyCount: number;
  water: WaterKind;
  hull: LatLng[];
  sources: {
    poi: SourceStamp;
    transit: SourceStamp;
  };
};

/**
 * Contract implemented by every reachability data source.
 * The service does not need to know whether data came from demo files or PostGIS.
 */
export interface ReachRepository {
  readonly dataSource: ReachResponse["dataSource"];

  findReachable(criteria: ReachSearchCriteria): Promise<ReachComputation>;

  isHealthy(): Promise<boolean>;
}
