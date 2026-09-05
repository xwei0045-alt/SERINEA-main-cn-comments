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

function townWithParks(locality: string, grocery: number, parks: number): LocalitySummaryItem {
  return {
    locality,
    lgaName: "Test LGA",
    regionalGroup: "Test Region",
    totalPoiCount: grocery + parks,
    categories: [
      { category: "shops", poiCount: grocery, subcategories: [{ subcategory: "supermarket", displayName: "Supermarket", poiCount: grocery }] },
      { category: "recreation", poiCount: parks, subcategories: [{ subcategory: "park", displayName: "Park", poiCount: parks }] }
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
  // Null detail loader keeps the injected summary counts for this unit test.
  const service = new CompareService(localities, null);

  const equal = await service.rank({ prefs: ["supermarket", "school"], q: "", limit: 2 });
  assert.equal(equal.items[0].locality, "Grocery Town");

  // Higher school weight must change the backend result, not only the UI preview.
  const weighted = await service.rank({
    prefs: ["supermarket", "school"],
    weights: [0.1, 0.9],
    q: "",
    limit: 2
  });

  assert.equal(weighted.preferences[0].weight, 0.1);
  assert.equal(weighted.preferences[1].weight, 0.9);
  assert.equal(weighted.items[0].locality, "School Town");
  assert.equal(weighted.items[0].breakdown.find((item) => item.preferenceId === "school")?.weighted, 0.9);
});

test("a large park count cannot outweigh a higher-priority supermarket preference", async () => {
  const service = new CompareService({
    listAll: async () => ({
      items: [townWithParks("Grocery Town", 10, 1), townWithParks("Park Town", 1, 510)],
      totalPois: 522,
      dataSource: "csv" as const
    })
  } as unknown as LocalitySummaryService);

  const result = await service.rank({ prefs: ["supermarket", "park"], weights: [0.9, 0.1], q: "", limit: 2 });
  assert.equal(result.items[0].locality, "Grocery Town");
});
