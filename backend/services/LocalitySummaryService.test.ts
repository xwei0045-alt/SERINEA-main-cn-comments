import assert from "node:assert/strict";
import test from "node:test";
import { LocalitySummaryService } from "./LocalitySummaryService";
import { CsvLocalitySummaryRepository } from "../test-support/CsvLocalitySummaryRepository";

test("TC-F06 searches locality summaries and keeps the supplied total", async () => {
  const result = await new LocalitySummaryService(new CsvLocalitySummaryRepository()).search({ q: "ABBEYARD", limit: 10 });

  assert.equal(result.dataSource, "csv");
  assert.ok(result.totalPois > 0);
  assert.equal(result.totalMatches, 1);
  assert.equal(result.items[0]?.locality, "ABBEYARD");
  assert.equal(result.items[0]?.totalPoiCount, 1);
  assert.ok(result.items[0]?.latitude);
  assert.ok(result.items[0]?.longitude);
});
