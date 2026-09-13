import { NextResponse, type NextRequest } from "next/server";
import { IncentiveService } from "@/backend/services/IncentiveService";
import { incentiveRequestSchema } from "@/shared/contracts/incentives";

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
      { error: { code: "INVALID_REQUEST", message: parsed.error.issues[0]?.message ?? "Invalid incentive request." } },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(await service.find(parsed.data));
  } catch (error) {
    console.error("Incentive matching failed.", error);
    return NextResponse.json(
      { error: { code: "INCENTIVE_FAILED", message: "Could not read the mock incentive data right now." } },
      { status: 500 }
    );
  }
}

