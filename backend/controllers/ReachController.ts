import { NextRequest, NextResponse } from "next/server";
import type { ReachService } from "@/backend/services/ReachService";
import { reachQuerySchema } from "@/shared/contracts/reach";

// 接收 HTTP 查询并交给 ReachService；参数错误返回 400，内部故障只记录在服务端日志中。
export class ReachController {
  // 注入可达性服务，控制器不直接访问数据库。
  constructor(private readonly service: ReachService) {}

  // 解析并校验查询参数，调用服务层后统一转换为 JSON 响应。
  async handle(request: NextRequest): Promise<NextResponse> {
    const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsedQuery = reachQuerySchema.safeParse(rawQuery);

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_QUERY",
            message: "The reachability request contains invalid values.",
            details: parsedQuery.error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message
            }))
          }
        },
        { status: 400 }
      );
    }

    try {
      const result = await this.service.search(parsedQuery.data);
      return NextResponse.json(result);
    } catch (error) {
      // 详细错误只写入服务端日志，浏览器收到不泄露内部信息的安全提示。
      console.error("Reachability request failed.", error);
      return NextResponse.json(
        {
          error: {
            code: "REACHABILITY_FAILED",
            message: "Reachability data is temporarily unavailable."
          }
        },
        { status: 500 }
      );
    }
  }
}
