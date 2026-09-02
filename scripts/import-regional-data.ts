import type { PoolClient, QueryResultRow } from "pg";
import { CsvDatasetLoader } from "../backend/data/CsvDatasetLoader";
import type {
  LocalityPoiSummaryRecord,
  RegionalDataset,
  RegionalPoiRecord
} from "../backend/data/RegionalDataset";
import { PostgresDatabase } from "../backend/database/PostgresDatabase";

const BATCH_SIZE = 500;
const VERSION_PATTERN = /^[A-Za-z0-9._-]+$/;

type CountRow = QueryResultRow & { count: number };

const POI_COLUMNS = [
  "dataset_version",
  "osm_id",
  "name",
  "latitude",
  "longitude",
  "locality",
  "lga_name",
  "abs_lga_code",
  "vicmap_lga_code",
  "regional_group",
  "area_type",
  "category",
  "subcategory",
  "display_name",
  "osm_tag_type",
  "osm_tag_value",
  "address_house_number",
  "address_street",
  "osm_address_suburb",
  "address_postcode",
  "operator_name",
  "brand",
  "phone",
  "website",
  "opening_hours",
  "wheelchair"
] as const;

const SUMMARY_COLUMNS = [
  "dataset_version",
  "locality",
  "lga_name",
  "abs_lga_code",
  "regional_group",
  "category",
  "subcategory",
  "display_name",
  "poi_count"
] as const;

/** Imports one complete version and switches the active pointer only after validation. */
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const version = readVersionArgument();
  const dataset = await new CsvDatasetLoader().load();
  const database = PostgresDatabase.getInstance(databaseUrl);

  try {
    await database.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        "serinea-regional-dataset-import"
      ]);
      await registerImport(client, version, dataset);
      await client.query("DELETE FROM locality_poi_summaries WHERE dataset_version = $1", [
        version
      ]);
      await client.query("DELETE FROM regional_pois WHERE dataset_version = $1", [version]);
      await insertPoiBatches(client, version, dataset.pois);
      await insertSummaryBatches(client, version, dataset.localitySummaries);
      await validateImportedCounts(client, version, dataset);
      await client.query("UPDATE dataset_versions SET active = FALSE WHERE active = TRUE");
      await client.query(
        `UPDATE dataset_versions
         SET status = 'ready', active = TRUE, imported_at = NOW()
         WHERE version = $1`,
        [version]
      );
    });

    console.log(`Database import completed and activated: ${version}`);
    console.log(`Detailed POIs: ${dataset.metadata.poiCount}`);
    console.log(`Summary rows: ${dataset.metadata.summaryRowCount}`);
  } finally {
    await database.close();
  }
}

function readVersionArgument(): string {
  const explicit = process.argv.find((value) => value.startsWith("--version="));
  const version = explicit?.slice("--version=".length) || "iteration1";
  if (!VERSION_PATTERN.test(version)) {
    throw new Error("Dataset version may contain only letters, numbers, dots, underscores, and dashes.");
  }
  return version;
}

async function registerImport(
  client: PoolClient,
  version: string,
  dataset: RegionalDataset
): Promise<void> {
  const metadata = dataset.metadata;
  await client.query(
    `INSERT INTO dataset_versions (
       version, detail_file_name, summary_file_name, source_date,
       poi_count, summary_row_count, summary_poi_count, status, active
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'importing', FALSE)
     ON CONFLICT (version) DO UPDATE SET
       detail_file_name = EXCLUDED.detail_file_name,
       summary_file_name = EXCLUDED.summary_file_name,
       source_date = EXCLUDED.source_date,
       poi_count = EXCLUDED.poi_count,
       summary_row_count = EXCLUDED.summary_row_count,
       summary_poi_count = EXCLUDED.summary_poi_count,
       status = 'importing',
       active = FALSE`,
    [
      version,
      metadata.detailFileName,
      metadata.summaryFileName,
      metadata.sourceDate,
      metadata.poiCount,
      metadata.summaryRowCount,
      metadata.summaryPoiCount
    ]
  );
}

async function insertPoiBatches(
  client: PoolClient,
  version: string,
  rows: RegionalPoiRecord[]
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE).map((row) => [
      version,
      row.osmId,
      row.name,
      row.latitude,
      row.longitude,
      row.locality,
      row.lgaName,
      row.absLgaCode,
      row.vicmapLgaCode,
      row.regionalGroup,
      row.areaType,
      row.category,
      row.subcategory,
      row.displayName,
      row.osmTagType,
      row.osmTagValue,
      row.addressHouseNumber,
      row.addressStreet,
      row.osmAddressSuburb,
      row.addressPostcode,
      row.operator,
      row.brand,
      row.phone,
      row.website,
      row.openingHours,
      row.wheelchair
    ]);
    await insertBatch(client, "regional_pois", POI_COLUMNS, batch);
  }
}

async function insertSummaryBatches(
  client: PoolClient,
  version: string,
  rows: LocalityPoiSummaryRecord[]
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE).map((row) => [
      version,
      row.locality,
      row.lgaName,
      row.absLgaCode,
      row.regionalGroup,
      row.category,
      row.subcategory,
      row.displayName,
      row.poiCount
    ]);
    await insertBatch(client, "locality_poi_summaries", SUMMARY_COLUMNS, batch);
  }
}

async function insertBatch(
  client: PoolClient,
  table: string,
  columns: readonly string[],
  rows: unknown[][]
): Promise<void> {
  const values: unknown[] = [];
  const tuples = rows.map((row) => {
    const placeholders = row.map((value) => {
      values.push(value);
      return `$${values.length}`;
    });
    return `(${placeholders.join(", ")})`;
  });

  await client.query(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${tuples.join(", ")}`,
    values
  );
}

async function validateImportedCounts(
  client: PoolClient,
  version: string,
  dataset: RegionalDataset
): Promise<void> {
  const poiResult = await client.query<CountRow>(
    "SELECT COUNT(*)::int AS count FROM regional_pois WHERE dataset_version = $1",
    [version]
  );
  const summaryResult = await client.query<CountRow>(
    "SELECT COUNT(*)::int AS count FROM locality_poi_summaries WHERE dataset_version = $1",
    [version]
  );

  if (poiResult.rows[0]?.count !== dataset.metadata.poiCount) {
    throw new Error("Imported POI count does not match the validated CSV count.");
  }
  if (summaryResult.rows[0]?.count !== dataset.metadata.summaryRowCount) {
    throw new Error("Imported summary row count does not match the validated CSV count.");
  }
}

main().catch((error: unknown) => {
  console.error("Database import failed.", error);
  process.exitCode = 1;
});
