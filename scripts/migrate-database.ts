import path from "path";
import { readFile } from "fs/promises";
import { PostgresDatabase } from "../backend/database/PostgresDatabase";

/** Applies the idempotent PostgreSQL schema before a dataset import or deployment. */
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const schema = await readFile(path.join(process.cwd(), "database", "schema.sql"), "utf8");
  const database = PostgresDatabase.getInstance(databaseUrl);
  try {
    await database.query(schema);
    console.log("Database migration completed.");
  } finally {
    await database.close();
  }
}

main().catch((error: unknown) => {
  console.error("Database migration failed.", error);
  process.exitCode = 1;
});
