import { describeWalkStep, walkingSecondsFromMeters } from "@/lib/walkCopy";
import type { LatLng } from "@/lib/types";
import type { WalkLeg, WalkRouteResponse, WalkStep } from "@/shared/contracts/walkRoute";

const FOSSGIS_FOOT =
  "https://routing.openstreetmap.de/routed-foot/route/v1/driving";
const SOURCE = "OpenStreetMap walking routes (FOSSGIS OSRM)";
const FAST_WALK_KMH = 8;

type OsrmManeuver = {
  type?: string;
  modifier?: string;
  location?: [number, number];
};

type OsrmStep = {
  name?: string;
  distance?: number;
  maneuver?: OsrmManeuver;
};

type OsrmLeg = {
  steps?: OsrmStep[];
};

type OsrmRoute = {
  distance?: number;
  duration?: number;
  geometry?: { coordinates?: [number, number][] };
  legs?: OsrmLeg[];
};

type OsrmResponse = {
  code?: string;
  message?: string;
  routes?: OsrmRoute[];
};

function toLatLng(pair: [number, number]): LatLng {
  return { lat: pair[1], lng: pair[0] };
}

function walkingSeconds(distanceMeters: number, reportedSeconds: number): number {
  if (distanceMeters <= 0) return 0;
  const impliedKmh = distanceMeters / 1000 / (Math.max(reportedSeconds, 1) / 3600);
  if (impliedKmh > FAST_WALK_KMH) return walkingSecondsFromMeters(distanceMeters);
  return reportedSeconds;
}

function mapSteps(steps: OsrmStep[] | undefined): WalkStep[] {
  return (steps ?? [])
    .filter((step) => step.maneuver?.type !== "arrive")
    .map((step) => {
      const location = step.maneuver?.location;
      return {
        instruction: describeWalkStep({
          type: step.maneuver?.type ?? "continue",
          modifier: step.maneuver?.modifier,
          name: step.name
        }),
        distanceMeters: Math.max(0, step.distance ?? 0),
        location: location ? toLatLng(location) : { lat: 0, lng: 0 }
      };
    })
    .filter((step) => Number.isFinite(step.location.lat) && Number.isFinite(step.location.lng));
}

// Street path from OSM foot routing.
// If the server gives a driving speed we throw that away and use 4.8 km/h.
export class FootWalkRouter {
  constructor(
    private readonly endpoint = FOSSGIS_FOOT,
    private readonly fetchImpl: typeof fetch = fetch.bind(globalThis)
  ) {}

  async route(input: {
    from: LatLng;
    to: LatLng;
    roundtrip: boolean;
  }): Promise<WalkRouteResponse> {
    const there = await this.oneLeg(input.from, input.to, "there");
    const legs: WalkLeg[] = [there];
    if (input.roundtrip) {
      legs.push(await this.oneLeg(input.to, input.from, "back"));
    }

    return {
      distanceMeters: legs.reduce((sum, leg) => sum + leg.distanceMeters, 0),
      durationSeconds: legs.reduce((sum, leg) => sum + leg.durationSeconds, 0),
      path: legs.flatMap((leg, index) => (index === 0 ? leg.path : leg.path.slice(1))),
      legs,
      source: SOURCE
    };
  }

  private async oneLeg(from: LatLng, to: LatLng, id: WalkLeg["id"]): Promise<WalkLeg> {
    const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `${this.endpoint}/${coordinates}?overview=full&geometries=geojson&steps=true`;
    const response = await this.fetchImpl(url, {
      headers: {
        "User-Agent": "SERINEA/0.1 (FIT5120 student project; walking routes)"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Walking router HTTP ${response.status}`);
    }

    const payload = (await response.json()) as OsrmResponse;
    if (payload.code !== "Ok" || !payload.routes?.[0]) {
      throw new Error(payload.message || "No walking route found.");
    }

    const route = payload.routes[0];
    const path = (route.geometry?.coordinates ?? []).map(toLatLng);
    if (path.length < 2) {
      throw new Error("Walking route had no path.");
    }

    const distanceMeters = route.distance ?? 0;
    return {
      id,
      distanceMeters,
      durationSeconds: walkingSeconds(distanceMeters, route.duration ?? 0),
      path,
      steps: mapSteps(route.legs?.[0]?.steps)
    };
  }
}
