type QueryableDatabase = {
  query(sql: string, values?: readonly unknown[]): Promise<unknown>;
};

/** Verifies that the deployed API account can read every table required by backend routes. */
export class DatabaseReadinessService {
  /** Sets up this component with the dependencies it needs. */
  constructor(private readonly database: QueryableDatabase) {}

  /** Checks that the API can read every required database table. */
  async isReady(): Promise<boolean> {
    try {
      await this.database.query("SELECT 1 FROM public.regional_pois LIMIT 1");
      await this.database.query("SELECT 1 FROM public.subsidies WHERE is_synthetic IS TRUE LIMIT 1");
      await this.database.query("SELECT 1 FROM public.sal_profiles LIMIT 1");
      await this.database.query("SELECT 1 FROM public.lga_profiles LIMIT 1");
      return true;
    } catch {
      return false;
    }
  }
}
