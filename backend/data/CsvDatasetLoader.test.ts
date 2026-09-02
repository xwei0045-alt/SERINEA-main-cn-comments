import assert from "node:assert/strict";
import test from "node:test";
import { CsvDatasetLoader } from "./CsvDatasetLoader";

test("loads both Iteration 1 files and reconciles their totals", async () => {
  const dataset = await new CsvDatasetLoader().load();

  assert.equal(dataset.metadata.poiCount, 32_569);
  assert.equal(dataset.metadata.summaryRowCount, 6_532);
  assert.equal(dataset.metadata.summaryPoiCount, dataset.metadata.poiCount);
  assert.equal(new Set(dataset.pois.map((poi) => poi.osmId)).size, 32_569);
});
