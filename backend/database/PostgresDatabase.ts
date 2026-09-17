import { Pool } from "pg";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";

// 在 Next.js 开发热重载期间保存共享数据库对象，避免重复创建连接池。
const databaseGlobal = globalThis as typeof globalThis & {
  serineaDatabase?: PostgresDatabase;
};

// 统一管理 PostgreSQL 连接池；其他后端模块通过该类访问数据库，不直接创建连接。
export class PostgresDatabase {
  // 只允许通过连接池构造数据库对象。
  private constructor(private readonly pool: Pool) {}

  // 首次调用时创建连接池，后续请求复用同一个实例。
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

  // 执行参数化 SQL 并返回带类型的查询行，参数数组用于防止拼接注入。
  async query<Row extends QueryResultRow>(
    sql: string,
    values: readonly unknown[] = []
  ): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(sql, [...values]);
  }

  // 执行最小查询测试数据库连通性，成功返回 true，异常返回 false。
  async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }

  // 在同一客户端执行一组操作；任一步失败就回滚，全部成功才提交。
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

  // 应用明确关闭时释放连接池，并清空全局缓存实例。
  async close(): Promise<void> {
    await this.pool.end();
    databaseGlobal.serineaDatabase = undefined;
  }
}
