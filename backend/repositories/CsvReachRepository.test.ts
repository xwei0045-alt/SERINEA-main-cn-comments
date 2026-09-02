import assert from "node:assert/strict";
import test from "node:test";
import { CsvReachRepository } from "./CsvReachRepository";
import { ReachService } from "../services/ReachService";

test("returns a mapped real POI near a supplied coordinate", async () => {
  const service = new ReachService(new CsvReachRepository());
  const result = await service.search({
    pin: { lat: -37.024456, lng: 146.695987 },
    windowMinutes: 15,
    categories: undefined
  });

  assert.equal(result.dataSource, "csv");
  assert.equal(result.hull.length, 48);
  assert.ok(result.reachable.some((row) => row.poi.id === "a33069469"));
  assert.ok(result.reachable.every((row) => row.journey.roundTripMinutes <= 15));
  assert.match(result.sources.transit.name, /no GTFS/i);
});

test("applies frontend category filters after CSV mapping", async () => {
  const service = new ReachService(new CsvReachRepository());
  const result = await service.search({
    pin: { lat: -37.024456, lng: 146.695987 },
    windowMinutes: 15,
    categories: ["pharmacy"]
  });

  assert.ok(result.reachable.every((row) => row.poi.category === "pharmacy"));
});
