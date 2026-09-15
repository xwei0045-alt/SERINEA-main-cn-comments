import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { CompareService } from "@/backend/services/CompareService";
import { compareQuerySchema } from "@/shared/contracts/compare";

export class CompareController {
  /** Sets up this component with the dependencies it needs. */
  constructor(private readonly service = new CompareService()) {}

  /** Validates the request and returns the API response. */
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
