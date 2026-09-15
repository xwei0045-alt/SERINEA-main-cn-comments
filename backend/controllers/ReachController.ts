import { NextRequest, NextResponse } from "next/server";
import type { ReachService } from "@/backend/services/ReachService";
import { reachQuerySchema } from "@/shared/contracts/reach";

// HTTP in, ReachService out. Bad query is 400. Real failures stay in the server log.
export class ReachController {
  /** Sets up this component with the dependencies it needs. */
  constructor(private readonly service: ReachService) {}

  /** Validates the request and returns the API response. */
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
      // The detailed error stays in server logs; browsers receive a safe message.
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
