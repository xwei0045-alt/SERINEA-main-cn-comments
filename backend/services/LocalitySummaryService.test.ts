import assert from "node:assert/strict";
import test from "node:test";
import { LocalitySummaryService } from "./LocalitySummaryService";

test("TC-F06 searches locality summaries and keeps the supplied total", async () => {
  const result = await new LocalitySummaryService().search({ q: "ABBEYARD", limit: 10 });

  assert.equal(result.dataSource, "csv");
  assert.equal(result.totalPois, 32_569);
  assert.equal(result.totalMatches, 1);
  assert.equal(result.items[0]?.locality, "ABBEYARD");
  assert.equal(result.items[0]?.totalPoiCount, 1);
  assert.ok(result.items[0]?.latitude);
  assert.ok(result.items[0]?.longitude);
});
