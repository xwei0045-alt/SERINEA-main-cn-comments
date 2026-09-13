import type { QueryResultRow } from "pg";

type QueryableDatabase = {
  query<Row extends QueryResultRow>(sql: string, values?: readonly unknown[]): Promise<unknown>;
};

/** Verifies that the deployed API account can read every table required by backend routes. */
export class DatabaseReadinessService {
  constructor(private readonly database: QueryableDatabase) {}

  async isReady(): Promise<boolean> {
    try {
      await this.database.query("SELECT 1 FROM public.regional_pois LIMIT 1");
      await this.database.query("SELECT 1 FROM public.subsidies WHERE is_synthetic IS TRUE LIMIT 1");
      return true;
    } catch {
      return false;
    }
  }
}
