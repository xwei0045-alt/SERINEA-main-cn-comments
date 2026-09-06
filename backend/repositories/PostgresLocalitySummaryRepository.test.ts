import assert from "node:assert/strict";
import test from "node:test";
import type { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { PostgresLocalitySummaryRepository } from "./PostgresLocalitySummaryRepository";
import { LocalitySummaryService } from "../services/LocalitySummaryService";

test("TC-F11 locality API can read the active PostgreSQL dataset", async () => {
  const database = {
    async query(sql: string) {
      if (sql.includes('AS "totalPois"')) {
        return { rows: [{ totalPois: 32_569 }] };
      }
      if (sql.includes("AVG(")) {
        return {
          rows: [
            {
              locality: "ABBEYARD",
              lgaName: "ALPINE",
              regionalGroup: "Ovens Murray",
              latitude: -37.024456,
              longitude: 146.695987
            }
          ]
        };
      }
      return {
        rows: [
          {
            locality: "ABBEYARD",
            lgaName: "ALPINE",
            absLgaCode: "20110",
            regionalGroup: "Ovens Murray",
            category: "recreation",
            subcategory: "nature_reserve",
            displayName: "Nature Reserve",
            poiCount: 1
          }
        ]
      };
    }
  } as unknown as PostgresDatabase;
  const service = new LocalitySummaryService(
    new PostgresLocalitySummaryRepository(database)
  );

  const result = await service.search({ q: "ABBEYARD", limit: 10 });

  assert.equal(result.dataSource, "database");
  assert.equal(result.totalPois, 32_569);
  assert.equal(result.items[0]?.locality, "ABBEYARD");
});
