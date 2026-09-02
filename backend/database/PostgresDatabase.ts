import { Pool } from "pg";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";

/** Stores the one shared database object during Next.js development reloads. */
const databaseGlobal = globalThis as typeof globalThis & {
  serineaDatabase?: PostgresDatabase;
};

/**
 * Owns the PostgreSQL connection pool.
 * The rest of the backend uses this class instead of opening new connections directly.
 */
export class PostgresDatabase {
  private constructor(private readonly pool: Pool) {}

  /** Creates the pool once and reuses it for later requests. */
  static getInstance(connectionString: string): PostgresDatabase {
    if (!databaseGlobal.serineaDatabase) {
      const pool = new Pool({
        connectionString,
        application_name: "serinea-web",
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 30_000,
        statement_timeout: 10_000,
        max: 10
      });

      databaseGlobal.serineaDatabase = new PostgresDatabase(pool);
    }

    return databaseGlobal.serineaDatabase;
  }

  /** Runs a parameterised query and returns strongly typed rows. */
  async query<Row extends QueryResultRow>(
    sql: string,
    values: readonly unknown[] = []
  ): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(sql, [...values]);
  }

  /** Uses a tiny query to check whether PostgreSQL is reachable. */
  async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  /** Runs related statements on one client and rolls them back together on failure. */
  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /** Closes every pooled connection during an intentional application shutdown. */
  async close(): Promise<void> {
    await this.pool.end();
    databaseGlobal.serineaDatabase = undefined;
  }
}
