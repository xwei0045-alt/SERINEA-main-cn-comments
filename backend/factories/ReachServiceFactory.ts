import { Environment } from "@/backend/config/Environment";
import { PostgresReachRepository } from "@/backend/repositories/PostgresReachRepository";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { ReachService } from "@/backend/services/ReachService";

// 地图 API 的生产数据源固定为 RDS 中的可达性表。
export class ReachServiceFactory {
  // 工厂只提供静态创建方法，因此禁止直接实例化。
  private constructor() {}

  // 创建生产可达性服务，并注入共享数据库和 PostgreSQL 仓储。
  static create(): ReachService {
    const environment = Environment.getInstance();

    return new ReachService(
      new PostgresReachRepository(
        PostgresDatabase.getInstance(environment.databaseUrl as string)
      )
    );
  }
}
