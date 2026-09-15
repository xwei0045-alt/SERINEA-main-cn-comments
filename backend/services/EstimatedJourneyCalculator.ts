import { destination, haversineKm } from "@/lib/geo";
import type { Journey, LatLng, Poi } from "@/lib/types";

const DEFAULT_WALKING_SPEED_KM_PER_HOUR = 4.8;

// Straight line walk at 4.8 km/h. This is the list filter, not the orange street line.
export class EstimatedJourneyCalculator {
  /** Sets up this component with the dependencies it needs. */
  constructor(
    private readonly walkingSpeedKmPerHour = DEFAULT_WALKING_SPEED_KM_PER_HOUR
  ) {}

  /** Estimates walking time in one direction. */
  oneWayMinutes(origin: LatLng, destinationPoint: LatLng): number {
    const distanceKm = haversineKm(origin, destinationPoint);
    return (distanceKm / this.walkingSpeedKmPerHour) * 60;
  }

  /** Builds a walking journey for one place. */
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

  /** Circular estimate for the maximum one-way walking distance in the window. */
  createReachHull(origin: LatLng, windowMinutes: number): LatLng[] {
    const radiusKm = (windowMinutes / 60) * this.walkingSpeedKmPerHour;
    return Array.from({ length: 48 }, (_, index) =>
      destination(origin, index * (360 / 48), radiusKm)
    );
  }

  /** @deprecated Prefer createReachHull — same full-window radius. */
  createRoundTripHull(origin: LatLng, windowMinutes: number): LatLng[] {
    return this.createReachHull(origin, windowMinutes);
  }

  /** Calculates the farthest allowed outbound distance. */
  maximumOutboundDistanceKm(windowMinutes: number): number {
    return (windowMinutes / 60) * this.walkingSpeedKmPerHour;
  }

  /** Handles the round step. */
  private round(value: number): number {
    return Math.round(value * 10) / 10;
  }
}

/** Handles the format walk distance step. */
function formatWalkDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
