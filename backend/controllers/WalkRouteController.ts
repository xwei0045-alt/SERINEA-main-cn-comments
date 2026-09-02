import { NextRequest, NextResponse } from "next/server";
import type { FootWalkRouter } from "@/backend/services/FootWalkRouter";
import { walkQuerySchema } from "@/shared/contracts/walkRoute";

// Checks the walk query, then asks the street router. Bad coords get 400, no path gets 502.
export class WalkRouteController {
  constructor(private readonly router: FootWalkRouter) {}

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
