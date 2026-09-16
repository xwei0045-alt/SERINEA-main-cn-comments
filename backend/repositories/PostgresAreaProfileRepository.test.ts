import assert from "node:assert/strict";
import test from "node:test";
import type { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { areaProfileKey } from "./AreaProfileRepository";
import { PostgresAreaProfileRepository } from "./PostgresAreaProfileRepository";

test("profile repository keeps SAL and LGA years separate and preserves missing values", async () => {
  const database = {
    async query(sql: string) {
      if (sql.includes("sal_profiles")) return { rows: [{
        code: "20570", name: "Ballarat", population: "113763", medianAgeYears: "39",
        medianPersonalIncomeWeeklyAud: "743", medianHouseholdIncomeWeeklyAud: "1429",
        unemploymentRatePct: "4.7", labourForceParticipationPct: "57.4",
        irsadScore: "965", irsadDecile: "7", ierScore: null, ierDecile: null,
        censusYear: "2021", seifaYear: "2021", seifaStatus: "available"
      }] };
      return { rows: [{
        code: "20570", name: "Ballarat", population: "113763", medianAgeYears: "39",
        medianPersonalIncomeWeeklyAud: "743", medianHouseholdIncomeWeeklyAud: "1429",
        unemploymentRatePct: "4.7", labourForceParticipationPct: "57.4",
        irsadScore: "965", irsadDecile: "7", ierScore: "971", ierDecile: "4",
        censusYear: "2021", seifaYear: "2021", seifaStatus: "available",
        incomeYear: "2023", jobsYear: "2023"
      }] };
    }
  } as unknown as PostgresDatabase;

  const result = await new PostgresAreaProfileRepository(database).findForAreas([
    { locality: "Ballarat", lgaName: "Ballarat" }
  ]);
  const evidence = result.get(areaProfileKey("Ballarat", "Ballarat"));
  assert.equal(evidence?.sal?.population, 113763);
  assert.equal(evidence?.sal?.ierScore, null);
  assert.equal(evidence?.lga?.incomeYear, 2023);
  assert.equal(evidence?.lga?.jobsYear, 2023);
});

test("duplicate SAL names are left unresolved instead of choosing the wrong suburb", async () => {
  const row = { code: "1", name: "Springfield", population: null, medianAgeYears: null,
    medianPersonalIncomeWeeklyAud: null, medianHouseholdIncomeWeeklyAud: null,
    unemploymentRatePct: null, labourForceParticipationPct: null, irsadScore: null,
    irsadDecile: null, ierScore: null, ierDecile: null, censusYear: 2021,
    seifaYear: 2021, seifaStatus: "missing" };
  const database = {
    async query(sql: string) {
      return { rows: sql.includes("sal_profiles") ? [row, { ...row, code: "2" }] : [] };
    }
  } as unknown as PostgresDatabase;
  const result = await new PostgresAreaProfileRepository(database).findForAreas([
    { locality: "Springfield", lgaName: "Example" }
  ]);
  assert.equal(result.get(areaProfileKey("Springfield", "Example"))?.sal, null);
});
