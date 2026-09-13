import assert from "node:assert/strict";
import test from "node:test";
import type { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { PostgresSubsidyRepository } from "./SubsidyRepository";

test("Postgres subsidy repository reads only synthetic records and maps numeric values", async () => {
  const database = {
    async query(sql: string) {
      assert.match(sql, /FROM public\.subsidies/);
      assert.match(sql, /WHERE is_synthetic IS TRUE/);
      return {
        rows: [{
          subsidyId: "MOCK-SUB-0001",
          subsidyName: "[MOCK] Test support",
          category: "relocation",
          locality: "LUCAS",
          lgaName: "BALLARAT",
          benefitType: "reimbursement",
          maxAmountAud: "2450.00",
          incomeLimitAnnual: "90000.00",
          incomeAssessmentUnit: "household",
          ageSubject: "applicant",
          ageMin: 18,
          ageMax: null,
          newResidentRequired: true,
          applyWithinDays: 90,
          minimumMoveDistanceKm: "50.0",
          eligibilitySummary: "Synthetic test rule",
          requiredEvidence: "Synthetic test evidence",
          mockStatus: "mock_open",
          recordNotice: "Fictional subsidy for testing only."
        }]
      };
    }
  } as unknown as PostgresDatabase;

  const records = await new PostgresSubsidyRepository(database).load();
  assert.equal(records.length, 1);
  assert.equal(records[0].maxAmountAud, 2450);
  assert.equal(records[0].incomeLimitAnnual, 90000);
  assert.equal(records[0].minimumMoveDistanceKm, 50);
});
