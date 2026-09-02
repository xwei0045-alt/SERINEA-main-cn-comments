import type { ReachRepository } from "@/backend/repositories/ReachRepository";
import type { ReachQuery, ReachResponse } from "@/shared/contracts/reach";

// Product rules sit here, not in the HTTP layer.
// A place has to be reachable both ways inside the 15 minute window or it stays off the list.
export class ReachService {
  constructor(private readonly repository: ReachRepository) {}

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
        const hasBothDirections =
          journey.outboundMinutes > 0 && journey.inboundMinutes > 0;
        const fitsRoundTrip =
          journey.roundTripMinutes <= query.windowMinutes + Number.EPSILON;
        const categoryMatches =
          !allowedCategories || allowedCategories.has(row.poi.category);

        return hasBothDirections && fitsRoundTrip && categoryMatches;
      })
      .sort(
        (first, second) =>
          first.journey.roundTripMinutes - second.journey.roundTripMinutes
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

  async isHealthy(): Promise<boolean> {
    return this.repository.isHealthy();
  }

  get dataSource(): ReachResponse["dataSource"] {
    return this.repository.dataSource;
  }
}
