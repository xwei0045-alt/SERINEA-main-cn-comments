import { NextResponse, type NextRequest } from "next/server";
import { IncentiveService } from "@/backend/services/IncentiveService";
import { incentiveRequestSchema } from "@/shared/contracts/incentives";

/**
 * POST /api/incentives
 *
 * WHO CALLS THIS
 * - frontend/api/IncentiveApiClient.ts (from AssistantClient on /ai-assistant)
 *
 * WHAT COMES IN (JSON body, see shared/contracts/incentives.ts)
 * - profile + relocationStage from the AI/mock extraction
 * - optional towns[] from Compare ranking (locality + lgaName)
 * - limitPerTown (usually 3)
 *
 * WHAT GOES OUT
 * - IncentiveResponse: groups[] of mock subsidies per town, with status
 *   (Potential Incentive / Possible Match / More Information Needed),
 *   matched[] / missing[] for AC2.2.3 eligibility explanation.
 *
 * DOES NOT
 * - change lifestyle scores or town order (incentives stay separate)
 * - match occupations (occupation_restriction is empty in current data)
 *
 * DATA SOURCE
 * - IncentiveService → SubsidyRepository → Postgres public.subsidies
 *   (CSV SERINEA_mock_subsidies_450.csv kept for tests / offline)
 */
export const runtime = "nodejs";

const service = new IncentiveService();

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } },
      { status: 400 }
    );
  }

  const parsed = incentiveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: parsed.error.issues[0]?.message ?? "Invalid incentive request."
        }
      },
      { status: 400 }
    );
  }

  try {
    // Service applies Potential Incentive rules and preserves incoming town order.
    return NextResponse.json(await service.find(parsed.data));
  } catch (error) {
    console.error("Incentive matching failed.", error);
    return NextResponse.json(
      {
        error: {
          code: "INCENTIVE_FAILED",
          message: "Could not read the mock incentive data from the database right now."
        }
      },
      { status: 500 }
    );
  }
}
