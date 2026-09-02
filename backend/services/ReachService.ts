import type { ReachRepository } from "@/backend/repositories/ReachRepository";
import type { ReachQuery, ReachResponse } from "@/shared/contracts/reach";

/**
 * Applies product rules to data returned by a repository.
 * Keeping these rules here makes them independent from HTTP and database details.
 */
export class ReachService {
  constructor(private readonly repository: ReachRepository) {}

  /** Calculates and validates the list displayed by the map page. */
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

  /** Reports whether the selected repository can answer requests. */
  async isHealthy(): Promise<boolean> {
    return this.repository.isHealthy();
  }

  /** Exposes the selected source without leaking the repository itself. */
  get dataSource(): ReachResponse["dataSource"] {
    return this.repository.dataSource;
  }
}
