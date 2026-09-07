import assert from "node:assert/strict";
import test from "node:test";
import type { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { PostgresReachRepository } from "./PostgresReachRepository";
import { ReachService } from "../services/ReachService";

test("TC-F07 database repository keeps the existing reachability response contract", async () => {
  let capturedSql = "";
  let capturedValues: readonly unknown[] = [];
  const database = {
    async query(sql: string, values: readonly unknown[] = []) {
      capturedSql = sql;
      capturedValues = values;
      return {
        rows: [
          {
            osmId: "a33069469",
            name: "Dandongadale Remote and Natural Area",
            displayName: "Nature Reserve",
            subcategory: "nature_reserve",
            latitude: -37.024456,
            longitude: 146.695987,
            locality: "ABBEYARD"
          }
        ]
      };
    }
  } as unknown as PostgresDatabase;
  const service = new ReachService(new PostgresReachRepository(database));

  const result = await service.search({
    pin: { lat: -37.024456, lng: 146.695987 },
    windowMinutes: 15,
    categories: undefined
  });

  assert.equal(result.dataSource, "database");
  assert.equal(result.reachable[0]?.poi.id, "a33069469");
  assert.match(result.sources.poi.name, /public\.regional_pois/);
  assert.match(capturedSql, /ST_DWithin\(/);
  assert.match(capturedSql, /location/);
  assert.deepEqual(capturedValues.slice(0, 3), [146.695987, -37.024456, 1_200]);
});
