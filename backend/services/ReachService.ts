import type { ReachRepository } from "@/backend/repositories/ReachRepository";
import type { ReachQuery, ReachResponse } from "@/shared/contracts/reach";

// 可达性产品规则集中在服务层，HTTP 控制器只负责解析请求和返回响应。
// 地点只有在从定位点出发的单程步行估算不超过固定 15 分钟时才会进入结果。
export class ReachService {
  // 保存可达性仓储，后续查询和健康检查都通过这个依赖完成。
  constructor(private readonly repository: ReachRepository) {}

  // 使用已校验的查询条件读取候选 POI，再按步行时间和类别过滤并排序。
  async search(query: ReachQuery): Promise<ReachResponse> {
    const calculation = await this.repository.findReachable({
      pin: query.pin,
      windowMinutes: query.windowMinutes
    });
    const allowedCategories = query.categories
      ? new Set(query.categories)
      : undefined;

    const reachable = calculation.reachable
      .filter((row) => {
        const journey = row.journey;
        const fitsWalk =
          journey.outboundMinutes > 0 &&
          journey.outboundMinutes <= query.windowMinutes + Number.EPSILON;
        const categoryMatches =
          !allowedCategories || allowedCategories.has(row.poi.category);

        return fitsWalk && categoryMatches;
      })
      .sort(
        (first, second) =>
          first.journey.outboundMinutes - second.journey.outboundMinutes
      );

    return {
      reachable,
      outboundOnlyCount: calculation.outboundOnlyCount,
      water: calculation.water,
      hull: calculation.hull,
      windowMinutes: query.windowMinutes,
      dataSource: this.repository.dataSource,
      generatedAt: new Date().toISOString(),
      sources: calculation.sources
    };
  }

  // 委托仓储检查当前数据源是否可用，供健康检查接口调用。
  async isHealthy(): Promise<boolean> {
    return this.repository.isHealthy();
  }

  get dataSource(): ReachResponse["dataSource"] {
    return this.repository.dataSource;
  }
}
