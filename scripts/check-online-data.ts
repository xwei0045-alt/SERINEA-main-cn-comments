import { PostgresDatabase } from "../backend/database/PostgresDatabase";

/** Stops deployment when the online database has not been populated. */
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required for the online data check.");

  const database = PostgresDatabase.getInstance(databaseUrl);
  try {
    const pois = await database.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM public.regional_pois'
    );
    const subsidies = await database.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM public.subsidies WHERE is_synthetic IS TRUE'
    );
    const salProfiles = await database.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM public.sal_profiles'
    );
    const lgaProfiles = await database.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM public.lga_profiles'
    );
    if (!pois.rows[0]?.count || !subsidies.rows[0]?.count || !salProfiles.rows[0]?.count || !lgaProfiles.rows[0]?.count) {
      throw new Error("One or more required online backend tables are empty.");
    }
    console.log(`Online data ready: ${pois.rows[0].count} POIs, ${subsidies.rows[0].count} synthetic subsidies, ${salProfiles.rows[0].count} SAL profiles, ${lgaProfiles.rows[0].count} LGA profiles.`);
  } finally {
    await database.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Online data check failed.");
  process.exitCode = 1;
});
