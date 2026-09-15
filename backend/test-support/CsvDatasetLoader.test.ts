import assert from "node:assert/strict";
import test from "node:test";
import { CsvDatasetLoader } from "./CsvDatasetLoader";

test("TC-F03 loads both Iteration 1 files and reconciles their totals", async () => {
  const dataset = await new CsvDatasetLoader().load();

  assert.ok(dataset.metadata.poiCount > 0);
  assert.equal(dataset.metadata.summaryRowCount, 6_532);
  assert.equal(dataset.metadata.summaryPoiCount, dataset.metadata.poiCount);
  assert.equal(new Set(dataset.pois.map((poi) => poi.osmId)).size, dataset.metadata.poiCount);
});
