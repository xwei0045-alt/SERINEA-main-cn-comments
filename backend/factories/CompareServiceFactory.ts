import { Environment } from "@/backend/config/Environment";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { PostgresAreaProfileRepository } from "@/backend/repositories/PostgresAreaProfileRepository";
import { PostgresComparePoiLoader } from "@/backend/repositories/PostgresComparePoiLoader";
import { LocalitySummaryServiceFactory } from "./LocalitySummaryServiceFactory";
import { CompareService } from "@/backend/services/CompareService";

// 将 Compare 连接到共享 RDS 和仅后端可访问的区域画像数据。
export class CompareServiceFactory {
  // 工厂类不保存实例，因此禁止直接构造。
  private constructor() {}

  // 创建生产环境服务，并注入 POI、SAL 和 LGA 仓储。
  static create(): CompareService {
    const environment = Environment.getInstance();
    const database = PostgresDatabase.getInstance(environment.databaseUrl as string);
    return new CompareService(
      LocalitySummaryServiceFactory.create(),
      new PostgresComparePoiLoader(database),
      new PostgresAreaProfileRepository(database)
    );
  }
}
