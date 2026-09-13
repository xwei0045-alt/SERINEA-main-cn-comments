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

test("scores retain missing preference weights instead of scaling the winner to 100", async () => {
  const service = new CompareService({
    listAll: async () => ({
      items: [town("Best Town", 10, 10), town("Other Town", 5, 5)],
      totalPois: 30, dataSource: "csv" as const
    })
  } as unknown as LocalitySummaryService, null);
  // No town has parks: its weight must still count in the denominator.
  const query = { prefs: ["supermarket", "park", "school"], q: "", limit: 2 };
  const equal = await service.rank(query);
  assert.ok(Math.abs(equal.items[0].score - 200 / 3) < 1e-10);
  assert.ok(Math.abs(equal.items[1].score - 100 / 3) < 1e-10);
  assert.equal(equal.recommendation?.score, equal.items[0].score);
  for (const weights of [[0.5, 0.3, 0.2], [5, 3, 2]]) {
    const weighted = await service.rank({ ...query, weights });
    assert.ok(Math.abs(weighted.items[0].score - 70) < 1e-10);
    assert.ok(Math.abs(weighted.items[1].score - 35) < 1e-10);
    assert.equal(weighted.items[0].breakdown[1].weighted, 0);
  }
  const complete = await service.rank({ ...query, prefs: ["supermarket", "school"] });
  assert.equal(complete.items[0].score, 100);
  const none = await service.rank({ ...query, prefs: ["park"] });
  assert.deepEqual(none.items, []);
});

test("primary-school and gym preferences use only the documented name proxies", async () => {
  const service = new CompareService({
    listAll: async () => ({
      items: [
        {
          locality: "Proxy Town",
          lgaName: "Test LGA",
          regionalGroup: "Test Region",
          totalPoiCount: 4,
          categories: [
            { category: "education", poiCount: 2, subcategories: [{ subcategory: "school", displayName: "School", poiCount: 2 }] },
            { category: "recreation", poiCount: 2, subcategories: [{ subcategory: "sports_centre", displayName: "Sports centre", poiCount: 2 }] }
          ]
        }
      ],
      totalPois: 4,
      dataSource: "csv" as const
    })
  } as unknown as LocalitySummaryService, {
    load: async () => ({
      pois: [
        { osmId: "1", name: "Proxy Primary School", locality: "Proxy Town", lgaName: "Test LGA", regionalGroup: "Test Region", subcategory: "school", displayName: "School", latitude: -37, longitude: 144 },
        { osmId: "2", name: "Proxy Secondary College", locality: "Proxy Town", lgaName: "Test LGA", regionalGroup: "Test Region", subcategory: "school", displayName: "School", latitude: -37.01, longitude: 144 },
        { osmId: "3", name: "Community Fitness Centre", locality: "Proxy Town", lgaName: "Test LGA", regionalGroup: "Test Region", subcategory: "sports_centre", displayName: "Sports centre", latitude: -37, longitude: 144.01 },
        { osmId: "4", name: "Aquatic Centre", locality: "Proxy Town", lgaName: "Test LGA", regionalGroup: "Test Region", subcategory: "sports_centre", displayName: "Sports centre", latitude: -37.01, longitude: 144.01 }
      ]
    })
  });

  const result = await service.rank({ prefs: ["primary_school", "gym"], weights: [5, 1], q: "", limit: 5 });
  assert.equal(result.items[0].breakdown[0].count, 1);
  assert.equal(result.items[0].breakdown[1].count, 1);
  assert.equal(result.preferences[0].evidenceMethod, "name_heuristic");
  assert.match(result.preferences[0].warning ?? "", /Coverage may be incomplete/);
});
