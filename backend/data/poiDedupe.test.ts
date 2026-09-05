import assert from "node:assert/strict";
import test from "node:test";
import { dedupeRegionalPois } from "./poiDedupe";

test("dedupe collapses OSM node/way clones a few metres apart", () => {
  const kept = dedupeRegionalPois([
    {
      osmId: "a1",
      name: "Aldi",
      locality: "ALFREDTON",
      subcategory: "supermarket",
      latitude: -37.5555794,
      longitude: 143.8167972
    },
    {
      osmId: "w1",
      name: "Aldi",
      locality: "ALFREDTON",
      subcategory: "supermarket",
      latitude: -37.55554,
      longitude: 143.816749
    }
  ]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0]?.name, "Aldi");
});

test("dedupe keeps same-name places that are genuinely separate", () => {
  const kept = dedupeRegionalPois([
    {
      osmId: "a1",
      name: "Apex Park",
      locality: "MILDURA",
      subcategory: "park",
      latitude: -34.18,
      longitude: 142.14
    },
    {
      osmId: "a2",
      name: "Apex Park",
      locality: "MILDURA",
      subcategory: "park",
      latitude: -34.22,
      longitude: 142.18
    }
  ]);
  assert.equal(kept.length, 2);
});
