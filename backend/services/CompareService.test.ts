import assert from "node:assert/strict";
import { test } from "node:test";
import { CompareService } from "./CompareService";
import type { LocalitySummaryService } from "./LocalitySummaryService";
import type { LocalitySummaryItem } from "@/shared/contracts/localities";

function town(locality: string, grocery: number, school: number): LocalitySummaryItem {
  return {
    locality,
    lgaName: "Test LGA",
    regionalGroup: "Test Region",
    totalPoiCount: grocery + school,
    categories: [
      {
        category: "shops",
        poiCount: grocery,
        subcategories: [{ subcategory: "supermarket", displayName: "Supermarket", poiCount: grocery }]
      },
      {
        category: "education",
        poiCount: school,
        subcategories: [{ subcategory: "school", displayName: "School", poiCount: school }]
      }
    ]
  };
}

const localities = {
  listAll: async () => ({
    items: [town("Grocery Town", 10, 0), town("School Town", 0, 9)],
    totalPois: 19,
    dataSource: "csv" as const
  })
} as unknown as LocalitySummaryService;

test("compare ranking uses weights aligned with the selected preference order", async () => {
  const service = new CompareService(localities);

  const equal = await service.rank({ prefs: ["grocery", "school"], q: "", limit: 2 });
  assert.equal(equal.items[0].locality, "Grocery Town");

  // Higher school weight must change the backend result, not only the UI preview.
  const weighted = await service.rank({
    prefs: ["grocery", "school"],
    weights: [0.1, 0.9],
    q: "",
    limit: 2
  });

  assert.equal(weighted.preferences[0].weight, 0.1);
  assert.equal(weighted.preferences[1].weight, 0.9);
  assert.equal(weighted.items[0].locality, "School Town");
  assert.equal(weighted.items[0].breakdown.find((item) => item.preferenceId === "school")?.weighted, 8.1);
});
