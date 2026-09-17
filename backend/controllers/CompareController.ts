import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { CompareServiceFactory } from "@/backend/factories/CompareServiceFactory";
import { compareQuerySchema } from "@/shared/contracts/compare";

export class CompareController {
  // 创建或接收比较服务，保证 HTTP 层不包含排名算法。
  constructor(private readonly service = CompareServiceFactory.create()) {}

  // 校验偏好参数，调用排名服务，并把参数错误或服务异常转换为 HTTP 状态码。
  async handle(request: NextRequest) {
    const parsed = compareQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    );

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid compare query.";
      return NextResponse.json(
        { error: { code: "INVALID_QUERY", message } },
        { status: 400 }
      );
    }

    if (parsed.data.prefs.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_QUERY",
            message: "Choose at least one preference."
          }
        },
        { status: 400 }
      );
    }

    try {
      const result = await this.service.rank(parsed.data);
      return NextResponse.json(result);
    } catch (error) {
      console.error("Compare ranking failed.", error);
      return NextResponse.json(
        {
          error: {
            code: "COMPARE_FAILED",
            message: "Could not rank localities right now."
          }
        },
        { status: 500 }
      );
    }
  }
}
