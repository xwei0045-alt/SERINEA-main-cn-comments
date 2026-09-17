import { z } from "zod";
import type { ReachResponse } from "@/shared/contracts/reach";

// 部署环境以 RDS/PostgreSQL 作为 POI 的唯一运行时数据源。
const environmentSchema = z
  .object({
    REACH_DATA_SOURCE: z.literal("database").default("database"),
    DATABASE_URL: z.string().trim().min(1).optional()
  })
  .superRefine((values, context) => {
    if (!values.DATABASE_URL) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when REACH_DATA_SOURCE=database."
      });
    }
  });

type EnvironmentValues = z.infer<typeof environmentSchema>;

// 只解析一次环境变量，其他类通过本对象读取配置，避免直接散落访问 process.env。
export class Environment {
  private static instance: Environment | undefined;

  // 保存已校验的环境配置；构造函数私有化以保证统一解析入口。
  private constructor(private readonly values: EnvironmentValues) {}

  // 返回后端共享配置实例，首次调用时执行 Zod 校验。
  static getInstance(): Environment {
    if (!Environment.instance) {
      Environment.instance = new Environment(environmentSchema.parse(process.env));
    }
    return Environment.instance;
  }

  get dataSource(): ReachResponse["dataSource"] {
    // 返回运行时数据源配置。
    return this.values.REACH_DATA_SOURCE;
  }

  get databaseUrl(): string | undefined {
    // 返回数据库连接字符串，连接失败时由数据库层处理。
    return this.values.DATABASE_URL;
  }
}
