import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseReadinessService } from "./DatabaseReadinessService";

test("database readiness checks every backend table", async () => {
  const queries: string[] = [];
  const database = {
    async query(sql: string) {
      queries.push(sql);
      return { rows: [{ exists: true }] };
    }
  };

  assert.equal(await new DatabaseReadinessService(database).isReady(), true);
  assert.equal(queries.length, 4);
  assert.match(queries[0], /public\.regional_pois/);
  assert.match(queries[1], /public\.subsidies/);
  assert.match(queries[2], /public\.sal_profiles/);
  assert.match(queries[3], /public\.lga_profiles/);
});

test("database readiness fails when a required table is not readable", async () => {
  const database = {
    async query(sql: string) {
      if (sql.includes("public.subsidies")) throw new Error("permission denied");
      return { rows: [{ exists: true }] };
    }
  };

  assert.equal(await new DatabaseReadinessService(database).isReady(), false);
});
