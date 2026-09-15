import { NextRequest, NextResponse } from "next/server";
import type { LocalitySummaryService } from "@/backend/services/LocalitySummaryService";
import { localitySummaryQuerySchema } from "@/shared/contracts/localities";

/** Translates HTTP requests into locality summary service calls. */
export class LocalitySummaryController {
  /** Sets up this component with the dependencies it needs. */
  constructor(private readonly service: LocalitySummaryService) {}

  /** Validates the request and returns the API response. */
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
