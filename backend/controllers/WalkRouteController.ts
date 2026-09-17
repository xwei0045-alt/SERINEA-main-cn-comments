import { NextRequest, NextResponse } from "next/server";
import type { FootWalkRouter } from "@/backend/services/FootWalkRouter";
import { walkQuerySchema } from "@/shared/contracts/walkRoute";

// 校验步行路线参数后调用街道路由器；坐标错误返回 400，路线服务失败返回 502。
export class WalkRouteController {
  // 注入街道路由器，控制器只负责协议转换。
  constructor(private readonly router: FootWalkRouter) {}

  // 校验路线请求，调用路由器并将结果或错误转换为 HTTP 响应。
  async handle(request: NextRequest): Promise<NextResponse> {
    const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsedQuery = walkQuerySchema.safeParse(rawQuery);

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_QUERY",
            message: "The walking route request contains invalid values."
          }
        },
        { status: 400 }
      );
    }

    try {
      const result = await this.router.route(parsedQuery.data);
      return NextResponse.json(result);
    } catch (error) {
      console.error("Walking route request failed.", error);
      return NextResponse.json(
        {
          error: {
            code: "WALK_ROUTE_FAILED",
            message: "A street walking route could not be found. Try another place."
          }
        },
        { status: 502 }
      );
    }
  }
}
