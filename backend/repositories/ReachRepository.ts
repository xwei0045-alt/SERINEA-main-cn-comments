import type { LatLng, ReachablePoi, SourceStamp, WaterKind } from "@/lib/types";
import type { ReachResponse } from "@/shared/contracts/reach";

export type ReachSearchCriteria = {
  pin: LatLng;
  windowMinutes: number;
};

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

export interface ReachRepository {
  readonly dataSource: ReachResponse["dataSource"];

  // 作用：实现 findReachable 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  findReachable(criteria: ReachSearchCriteria): Promise<ReachComputation>;

  // 作用：实现 isHealthy 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  isHealthy(): Promise<boolean>;
}
