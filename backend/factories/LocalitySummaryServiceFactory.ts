import { Environment } from "@/backend/config/Environment";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { PostgresLocalitySummaryRepository } from "@/backend/repositories/PostgresLocalitySummaryRepository";
import { LocalitySummaryService } from "@/backend/services/LocalitySummaryService";

// 城镇搜索聚合与可达性使用的同一套生产 POI 数据。
export class LocalitySummaryServiceFactory {
  // 工厂只提供静态创建方法，因此禁止直接实例化。
  private constructor() {}

  // 创建生产城镇摘要服务，并注入数据库仓储。
  static create(): LocalitySummaryService {
    const environment = Environment.getInstance();
    return new LocalitySummaryService(
      new PostgresLocalitySummaryRepository(
        PostgresDatabase.getInstance(environment.databaseUrl as string)
      )
    );
  }
}
