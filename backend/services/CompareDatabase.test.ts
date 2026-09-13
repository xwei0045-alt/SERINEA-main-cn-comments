import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { Environment } from "@/backend/config/Environment";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { CsvDatasetLoader } from "@/backend/data/CsvDatasetLoader";
import { CompareController } from "@/backend/controllers/CompareController";
import { buildRecommendations } from "./ChatRecommendationService";
import { planSchema } from "@/lib/chatRecommendations";
import { PostgresComparePoiLoader } from "@/backend/repositories/PostgresComparePoiLoader";

test("Compare and AI default to database without reading CSV, preserving dedupe and pins", async (t) => {
  t.mock.method(Environment, "getInstance", () => ({ databaseUrl: "unused-test-connection" }));
  t.mock.method(CsvDatasetLoader.prototype, "load", () => { throw new Error("CSV must not be read"); });
  const poi = { osmId: "1", name: "Park", locality: "TEST TOWN", lgaName: "TEST LGA",
    regionalGroup: "Test Region", subcategory: "park", displayName: "Park", latitude: -37, longitude: 144 };
  const database = { async query(sql: string) {
    assert.match(sql, /public\.regional_pois/);
    if (sql.includes('AS "totalPois"')) return { rows: [{ totalPois: 2 }] };
    if (sql.includes("AVG(")) return { rows: [{ ...poi, latitude: -37.01 }] };
    if (sql.includes('AS "poiCount"')) return { rows: [{ ...poi, absLgaCode: "1", category: "recreation", poiCount: 2 }] };
    return { rows: [poi, { ...poi, osmId: "2", latitude: -37.00001 }] };
  } } as unknown as PostgresDatabase;
  t.mock.method(PostgresDatabase, "getInstance", () => database);
  const response = await new CompareController().handle(new NextRequest("http://localhost/api/compare?prefs=park&q=TEST&limit=10"));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.dataSource, "database");
  assert.equal(result.items[0].breakdown[0].count, 1);
  assert.equal(result.items[0].latitude, -37);
  assert.equal(result.items[0].score, 100);
  const plan = planSchema.parse({ include: ["park"], area: "TEST", intent: "recommend", town: "", priority: false, bonus: [], exclude: [], unverified: [] });
  const reply = await buildRecommendations(plan);
  assert.equal(reply.places[0].name, "Test Town");
  assert.equal(reply.places[0].latitude, result.items[0].latitude);
  assert.match(reply.reply, /AWS RDS: public.regional_pois/);
  assert.doesNotMatch(reply.reply, /CSV|\.csv/);
  const details = await buildRecommendations({ ...plan, intent: "town_details", town: "TEST TOWN" });
  assert.match(details.reply, /Park: 1/);
  assert.match(details.reply, /AWS RDS/);
  const empty = await new CompareController().handle(new NextRequest("http://localhost/api/compare?prefs=park&q=NO_MATCH"));
  assert.deepEqual((await empty.json()).items, []);
});

test("database detail loader skips invalid coordinates", async () => {
  const database = {
    query: async () => ({
      rows: [
        {
          osmId: "1",
          name: "Park",
          locality: "A",
          lgaName: "B",
          regionalGroup: "C",
          subcategory: "park",
          displayName: "Park",
          latitude: null,
          longitude: 144
        },
        {
          osmId: "2",
          name: "Park 2",
          locality: "A",
          lgaName: "B",
          regionalGroup: "C",
          subcategory: "park",
          displayName: "Park",
          latitude: -37,
          longitude: 144
        }
      ]
    })
  } as unknown as PostgresDatabase;
  const { pois } = await new PostgresComparePoiLoader(database).load();
  assert.equal(pois.length, 1);
  assert.equal(pois[0].osmId, "2");
});
