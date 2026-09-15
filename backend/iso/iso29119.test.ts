import assert from "node:assert/strict";
import test from "node:test";
import type { Poi, ReachablePoi } from "@/lib/types";
import { RegionalPoiMapper } from "@/backend/mappers/RegionalPoiMapper";
import type {
  ReachComputation,
  ReachRepository,
  ReachSearchCriteria
} from "@/backend/repositories/ReachRepository";
import { EstimatedJourneyCalculator } from "@/backend/services/EstimatedJourneyCalculator";
import { FootWalkRouter } from "@/backend/services/FootWalkRouter";
import { ReachService } from "@/backend/services/ReachService";
import { reachQuerySchema } from "@/shared/contracts/reach";
import { walkQuerySchema } from "@/shared/contracts/walkRoute";

const stamp = { name: "test", date: "2026-09-02", note: "fixture" };

function poi(id: string, category: Poi["category"] = "park"): Poi {
  return {
    id,
    name: id,
    category,
    lat: -36.378,
    lng: 145.403,
    suburb: "SHEPPARTON"
  };
}

function row(
  id: string,
  outbound: number,
  inbound: number,
  category: Poi["category"] = "park"
): ReachablePoi {
  return {
    poi: poi(id, category),
    journey: {
      outbound: [{ mode: "walk", minutes: outbound, text: "there" }],
      inbound: [{ mode: "walk", minutes: inbound, text: "back" }],
      outboundMinutes: outbound,
      inboundMinutes: inbound,
      roundTripMinutes: outbound + inbound
    }
  };
}

class FakeReachRepository implements ReachRepository {
  readonly dataSource = "csv" as const;

  constructor(private readonly computation: ReachComputation) {}

  async findReachable(_criteria: ReachSearchCriteria): Promise<ReachComputation> {
    return this.computation;
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}

test("TC-F01 walk from pin within 15 minutes or the place stays off the list", async () => {
  const service = new ReachService(
    new FakeReachRepository({
      reachable: [
        row("keep", 6, 6),
        row("edge", 14, 14),
        row("too-far", 16, 16)
      ],
      outboundOnlyCount: 0,
      water: null,
      hull: [],
      sources: { poi: stamp, transit: stamp }
    })
  );

  const result = await service.search({
    pin: { lat: -36.378, lng: 145.403 },
    windowMinutes: 15,
    categories: undefined
  });

  assert.deepEqual(
    result.reachable.map((item) => item.poi.id),
    ["keep", "edge"]
  );
});

test("TC-F02 category filter only returns the types you ticked", async () => {
  const service = new ReachService(
    new FakeReachRepository({
      reachable: [row("park-1", 5, 5, "park"), row("chemist", 5, 5, "pharmacy")],
      outboundOnlyCount: 0,
      water: null,
      hull: [],
      sources: { poi: stamp, transit: stamp }
    })
  );

  const result = await service.search({
    pin: { lat: -36.378, lng: 145.403 },
    windowMinutes: 15,
    categories: ["pharmacy"]
  });

  assert.equal(result.reachable.length, 1);
  assert.equal(result.reachable[0]?.poi.category, "pharmacy");
});

test("TC-F09 mapper keeps map types only", () => {
  const mapper = new RegionalPoiMapper();
  const base = {
    osmId: "n1",
    name: "",
    displayName: "Queen Park",
    latitude: -36.37,
    longitude: 145.4,
    locality: "SHEPPARTON"
  };

  assert.equal(mapper.toMapPoi({ ...base, subcategory: "park" })?.category, "park");
  assert.equal(mapper.toMapPoi({ ...base, osmId: "n2", subcategory: "doctor" })?.category, "gp");
  assert.equal(mapper.toMapPoi({ ...base, osmId: "n3", subcategory: "school" })?.category, "school");
  assert.equal(mapper.toMapPoi({ ...base, osmId: "n4", subcategory: "hospital" })?.category, "hospital");
});

test("TC-F10 reject a 30 minute window", () => {
  const parsed = reachQuerySchema.safeParse({
    lat: "-36.378",
    lng: "145.403",
    window: "30"
  });
  assert.equal(parsed.success, false);
});

test("TC-P02 walk time at 4.8 km/h", () => {
  const calculator = new EstimatedJourneyCalculator();
  const origin = { lat: -36.378, lng: 145.403 };
  const place = poi("far");
  place.lat = origin.lat + 0.0072;
  const journey = calculator.createWalkingJourney(origin, place);
  assert.ok(journey.outboundMinutes > 8);
  assert.ok(journey.roundTripMinutes > 16);
  assert.equal(journey.inboundMinutes, journey.outboundMinutes);
});

test("TC-R01 street router ignores driving speed", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        code: "Ok",
        routes: [
          {
            distance: 4800,
            duration: 200,
            geometry: {
              coordinates: [
                [145.4, -36.38],
                [145.41, -36.381]
              ]
            },
            legs: [
              {
                steps: [
                  {
                    name: "Edward Street",
                    distance: 100,
                    maneuver: { type: "depart", location: [145.4, -36.38] }
                  }
                ]
              }
            ]
          }
        ]
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );

  const router = new FootWalkRouter("https://example.test", fetchImpl);
  const result = await router.route({
    from: { lat: -36.38, lng: 145.4 },
    to: { lat: -36.381, lng: 145.41 },
    roundtrip: false
  });

  assert.equal(Math.round(result.durationSeconds), 3600);
  assert.equal(result.legs[0]?.steps[0]?.instruction, "Start walking along Edward Street");
});

test("TC-S01 bad coordinates are rejected", () => {
  const reach = reachQuerySchema.safeParse({ lat: "999", lng: "145.4", window: "15" });
  const walk = walkQuerySchema.safeParse({
    fromLat: "-36.38",
    fromLng: "145.4",
    toLng: "145.41"
  });
  assert.equal(reach.success, false);
  assert.equal(walk.success, false);
});
