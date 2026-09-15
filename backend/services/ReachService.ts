import type { ReachRepository } from "@/backend/repositories/ReachRepository";
import type { ReachQuery, ReachResponse } from "@/shared/contracts/reach";

// Product rules sit here, not in the HTTP layer.
// A place appears if the walk from the pin fits inside the fixed 15-minute window.
export class ReachService {
  /** Sets up this component with the dependencies it needs. */
  constructor(private readonly repository: ReachRepository) {}

  /** Searches the data using the validated request. */
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

  /** Checks whether the required data source is available. */
  async isHealthy(): Promise<boolean> {
    return this.repository.isHealthy();
  }

  get dataSource(): ReachResponse["dataSource"] {
    return this.repository.dataSource;
  }
}
