import assert from "node:assert/strict";
import test from "node:test";
import type { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { PostgresReachRepository } from "./PostgresReachRepository";
import { ReachService } from "../services/ReachService";

test("database repository keeps the existing reachability response contract", async () => {
  const database = {
    async query(sql: string) {
      if (sql.includes("FROM dataset_versions")) {
        return {
          rows: [
            {
              version: "iteration1",
              detailFileName: "regional_pois_detail_optimized_iteration1.csv",
              sourceDate: "2026-09-02",
              poiCount: 32_569
            }
          ]
        };
      }
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
  assert.match(result.sources.poi.note, /iteration1/);
});
