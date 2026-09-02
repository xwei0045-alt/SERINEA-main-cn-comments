import { destination, haversineKm } from "@/lib/geo";
import type { Journey, LatLng, Poi } from "@/lib/types";

const DEFAULT_WALKING_SPEED_KM_PER_HOUR = 4.8;

/**
 * Provides an explicit straight-line walking estimate while GTFS data is unavailable.
 * This is intentionally separate from real transit routing so the two cannot be confused.
 */
export class EstimatedJourneyCalculator {
  constructor(
    private readonly walkingSpeedKmPerHour = DEFAULT_WALKING_SPEED_KM_PER_HOUR
  ) {}

  oneWayMinutes(origin: LatLng, destinationPoint: LatLng): number {
    const distanceKm = haversineKm(origin, destinationPoint);
    return (distanceKm / this.walkingSpeedKmPerHour) * 60;
  }

  createWalkingJourney(origin: LatLng, poi: Poi): Journey {
    const distanceKm = haversineKm(origin, poi);
    const minutes = Math.max(0.1, (distanceKm / this.walkingSpeedKmPerHour) * 60);
    const roundedMinutes = this.round(minutes);
    const roundedTrip = this.round(roundedMinutes * 2);
    const distanceText = formatWalkDistance(distanceKm);

    return {
      outbound: [
        {
          mode: "walk",
          minutes: roundedMinutes,
          text: `About ${distanceText} on foot`
        }
      ],
      inbound: [
        {
          mode: "walk",
          minutes: roundedMinutes,
          text: "Same walk back"
        }
      ],
      outboundMinutes: roundedMinutes,
      inboundMinutes: roundedMinutes,
      roundTripMinutes: roundedTrip
    };
  }

  /** Builds a circular estimate for the maximum half-window walking distance. */
  createRoundTripHull(origin: LatLng, windowMinutes: number): LatLng[] {
    const oneWayMinutes = windowMinutes / 2;
    const radiusKm = (oneWayMinutes / 60) * this.walkingSpeedKmPerHour;
    return Array.from({ length: 48 }, (_, index) =>
      destination(origin, index * (360 / 48), radiusKm)
    );
  }

  maximumOutboundDistanceKm(windowMinutes: number): number {
    return (windowMinutes / 60) * this.walkingSpeedKmPerHour;
  }

  private round(value: number): number {
    return Math.round(value * 10) / 10;
  }
}

function formatWalkDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
