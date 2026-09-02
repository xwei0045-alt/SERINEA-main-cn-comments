import { CsvDatasetLoader } from "../backend/data/CsvDatasetLoader";

/** Command-line validation used before committing or importing a new data handover. */
async function main(): Promise<void> {
  const dataset = await new CsvDatasetLoader().load();
  const localities = new Set(dataset.localitySummaries.map((row) => row.locality));
  const lgas = new Set(dataset.localitySummaries.map((row) => row.lgaName));

  console.log("Regional dataset validation passed.");
  console.log(`Detailed POIs: ${dataset.metadata.poiCount}`);
  console.log(`Summary rows: ${dataset.metadata.summaryRowCount}`);
  console.log(`Summary POI total: ${dataset.metadata.summaryPoiCount}`);
  console.log(`Localities: ${localities.size}`);
  console.log(`LGAs: ${lgas.size}`);
}

main().catch((error: unknown) => {
  console.error("Regional dataset validation failed.", error);
  process.exitCode = 1;
});
