import { NextRequest, NextResponse } from "next/server";
import type { LocalitySummaryService } from "@/backend/services/LocalitySummaryService";
import { localitySummaryQuerySchema } from "@/shared/contracts/localities";

// 将 HTTP 请求转换为城镇摘要服务调用，并集中处理输入校验和错误响应。
export class LocalitySummaryController {
  // 注入城镇摘要服务，保持控制器与具体数据源解耦。
  constructor(private readonly service: LocalitySummaryService) {}

  // 校验搜索参数，调用服务层并返回城镇摘要 JSON。
  async handle(request: NextRequest): Promise<NextResponse> {
    const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsedQuery = localitySummaryQuerySchema.safeParse(rawQuery);

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_QUERY",
            message: "The locality request contains invalid values.",
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
      return NextResponse.json(await this.service.search(parsedQuery.data));
    } catch (error) {
      console.error("Locality summary request failed.", error);
      return NextResponse.json(
        {
          error: {
            code: "LOCALITY_SUMMARY_FAILED",
            message: "Locality summary data is temporarily unavailable."
          }
        },
        { status: 500 }
      );
    }
  }
}
