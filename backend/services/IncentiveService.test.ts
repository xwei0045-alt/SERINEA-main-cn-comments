import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { IncentiveService } from "./IncentiveService";
import {
  CsvSubsidyRepository,
  type SubsidyRecord,
  type SubsidyRepository
} from "@/backend/repositories/SubsidyRepository";
import type { IncentiveRequest } from "@/shared/contracts/incentives";

const dataDirectory = path.join(process.cwd(), "data");
const service = new IncentiveService(new CsvSubsidyRepository(dataDirectory));

function request(overrides: Partial<IncentiveRequest> = {}): IncentiveRequest {
  return {
    message: "What mock incentives are available in Lucas?",
    relocationStage: "already_moved",
    profile: {
      age: 28,
      income: 80_000,
      income_scope: "household",
      income_period: "annual",
      income_basis: "gross",
      has_child: false,
      child_ages: [],
      locality: null,
      lga_name: null,
      move_distance_km: 60,
      days_since_move: 30,
      new_resident: true
    },
    towns: [],
    limitPerTown: 5,
    ...overrides
  };
}

test("named locality query returns only non-closed mock records", async () => {
  const result = await service.find(request());
  assert.equal(result.dataSource, "SERINEA_mock_subsidies_450.csv");
  assert.equal(result.isSynthetic, true);
  assert.equal(result.queryArea, "LUCAS");
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].locality, "LUCAS");
  assert.ok(result.groups[0].items.length > 0);
  assert.ok(result.groups[0].items.every((item) =>
    ["mock_open", "mock_upcoming"].includes(item.mockStatus)
  ));
});

test("complete Lucas relocation facts produce a Possible Match", async () => {
  const result = await service.find(request({
    message: "I need moving expense support in Lucas."
  }));
  const moving = result.groups[0].items.find((item) => item.subsidyId === "MOCK-SUB-0002");
  assert.equal(moving?.status, "Possible Match");
  assert.deepEqual(moving?.missing, []);
});

test("planning users receive Potential Incentive without changing lifestyle order", async () => {
  const towns = [
    { locality: "Wangaratta", lgaName: "Wangaratta" },
    { locality: "Shepparton", lgaName: "Greater Shepparton" }
  ];
  const result = await service.find(request({
    message: "We plan to move and want incentive guidance.",
    relocationStage: "planning_to_move",
    towns
  }));
  assert.deepEqual(result.groups.map((group) => group.locality), ["WANGARATTA", "SHEPPARTON"]);
  assert.ok(result.groups.flatMap((group) => group.items).every((item) => item.status === "Potential Incentive"));
});

test("unknown income scope is surfaced instead of silently compared", async () => {
  const base = request();
  const result = await service.find(request({
    message: "I need moving expense support in Lucas.",
    profile: { ...base.profile, income_scope: "unknown" }
  }));
  const moving = result.groups[0].items.find((item) => item.subsidyId === "MOCK-SUB-0002");
  assert.equal(moving?.status, "More Information Needed");
  assert.ok(moving?.missing.includes("Household income scope"));
});

test("dependent-child rules use child age and never applicant age", async () => {
  const base = request();
  const result = await service.find(request({
    message: "What school support is available in Lucas?",
    profile: { ...base.profile, has_child: true, child_ages: [7] }
  }));
  const school = result.groups[0].items.find((item) => item.subsidyId === "MOCK-SUB-0066");
  assert.equal(school?.status, "Possible Match");
  assert.ok(school?.matched.includes("Dependent child's age"));
});

test("dependent-child incentives are excluded when the user explicitly has no children", async () => {
  const result = await service.find(request({
    message: "What school support is available in Lucas?"
  }));

  assert.equal(result.groups.length, 1);
  assert.ok(result.groups[0].items.every((item) => item.subsidyId !== "MOCK-SUB-0066"));
  assert.ok(result.groups[0].items.every((item) => !item.missing.includes("Dependent child's age")));
});

test("profile locality and LGA are treated as one exact area", async () => {
  const baseRecord: SubsidyRecord = {
    subsidyId: "MOCK-SUB-TEST",
    subsidyName: "[MOCK] Test support",
    category: "relocation",
    locality: "SPRINGFIELD",
    lgaName: "LGA ONE",
    benefitType: "grant",
    maxAmountAud: 1000,
    incomeLimitAnnual: null,
    incomeAssessmentUnit: "household",
    ageSubject: "applicant",
    ageMin: null,
    ageMax: null,
    newResidentRequired: false,
    applyWithinDays: null,
    minimumMoveDistanceKm: null,
    eligibilitySummary: "Synthetic rule",
    requiredEvidence: "Synthetic evidence",
    mockStatus: "mock_open",
    recordNotice: "Fictional subsidy for testing only."
  };
  const repository: SubsidyRepository = {
    dataSource: "database",
    async load() {
      return [baseRecord, { ...baseRecord, subsidyId: "MOCK-SUB-OTHER", lgaName: "LGA TWO" }];
    }
  };
  const exactAreaService = new IncentiveService(repository);
  const base = request();
  const result = await exactAreaService.find(request({
    message: "Show available support.",
    profile: { ...base.profile, locality: "Springfield", lga_name: "LGA Two" }
  }));

  assert.deepEqual(result.groups.map((group) => group.lgaName), ["LGA TWO"]);
  assert.deepEqual(result.groups[0].items.map((item) => item.subsidyId), ["MOCK-SUB-OTHER"]);
});

test("database records refresh after the cache TTL", async () => {
  let loads = 0;
  let time = 1_000;
  const repository: SubsidyRepository = {
    dataSource: "database",
    async load() {
      loads += 1;
      return [];
    }
  };
  const refreshingService = new IncentiveService(repository, 100, () => time);

  await refreshingService.find(request());
  time += 50;
  await refreshingService.find(request());
  assert.equal(loads, 1);

  time += 51;
  await refreshingService.find(request());
  assert.equal(loads, 2);
});

test("a failed database read is retried on the next request", async () => {
  let loads = 0;
  const repository: SubsidyRepository = {
    dataSource: "database",
    async load() {
      loads += 1;
      if (loads === 1) throw new Error("temporary database error");
      return [];
    }
  };
  const retryingService = new IncentiveService(repository);

  await assert.rejects(() => retryingService.find(request()), /temporary database error/);
  await retryingService.find(request());
  assert.equal(loads, 2);
});
