import assert from "node:assert/strict";
import { test } from "node:test";
import { CompareService } from "./CompareService";
import type { LocalitySummaryService } from "./LocalitySummaryService";
import type { LocalitySummaryItem } from "@/shared/contracts/localities";
import { areaProfileKey, type AreaProfileRepository } from "@/backend/repositories/AreaProfileRepository";

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
  assert.ok(Math.abs(equal.items[0].score - 65) < 1e-10);
  assert.ok(Math.abs(equal.items[1].score - 32.5) < 1e-10);
  assert.equal(equal.recommendation?.score, equal.items[0].score);
  for (const weights of [[0.5, 0.3, 0.2], [5, 3, 2]]) {
    const weighted = await service.rank({ ...query, weights });
    assert.ok(Math.abs(weighted.items[0].score - 67.5) < 1e-10);
    assert.ok(Math.abs(weighted.items[1].score - 33.75) < 1e-10);
    assert.equal(weighted.items[0].breakdown[1].weighted, 0);
  }
  const complete = await service.rank({ ...query, prefs: ["supermarket", "school"] });
  assert.equal(complete.items[0].score, 90);
  const none = await service.rank({ ...query, prefs: ["park"] });
  assert.deepEqual(none.items, []);
});

test("SAL/LGA profile evidence supplies the 10 percent component before ranking", async () => {
  const summaries = {
    listAll: async () => ({
      items: [town("POI Leader", 10, 0), town("Profile Leader", 9, 0)],
      totalPois: 19,
      dataSource: "database" as const
    })
  } as unknown as LocalitySummaryService;
  const profile = {
    code: "2",
    name: "Profile Leader",
    population: 1000,
    medianAgeYears: 40,
    medianPersonalIncomeWeeklyAud: 1000,
    medianHouseholdIncomeWeeklyAud: 2500,
    unemploymentRatePct: 0,
    labourForceParticipationPct: 100,
    irsadScore: 1100,
    irsadDecile: 10,
    ierScore: 1100,
    ierDecile: 10,
    censusYear: 2021,
    seifaYear: 2021,
    seifaStatus: "available"
  };
  const profiles = {
    async findForAreas() {
      return new Map([
        [areaProfileKey("Profile Leader", "Test LGA"), { sal: profile, lga: null }]
      ]);
    }
  } as AreaProfileRepository;

  const result = await new CompareService(summaries, null, profiles).rank({
    prefs: ["supermarket"],
    q: "",
    limit: 2
  });

  assert.equal(result.items[0].locality, "Profile Leader");
  assert.equal(result.items[0].scoreComponents.userNeeds.weight, 0.75);
  assert.equal(result.items[0].scoreComponents.poiCoverage.weight, 0.15);
  assert.equal(result.items[0].scoreComponents.areaProfile.weight, 0.1);
  assert.equal(result.items[0].scoreComponents.areaProfile.score, 100);
  assert.equal(result.items[0].profileEvidence?.affectsRanking, true);
});
