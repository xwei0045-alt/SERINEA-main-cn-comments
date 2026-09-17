type QueryableDatabase = {
  // 作用：实现 query 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  query(sql: string, values?: readonly unknown[]): Promise<unknown>;
};

export class DatabaseReadinessService {
  // 作用：实现 constructor 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
  constructor(private readonly database: QueryableDatabase) {}

  // 作用：实现 isReady 的后端职责；实现：在函数体内完成参数处理、数据访问或结果转换。
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
