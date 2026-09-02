import type { NextRequest } from "next/server";
import { WalkRouteController } from "@/backend/controllers/WalkRouteController";
import { FootWalkRouter } from "@/backend/services/FootWalkRouter";

export const runtime = "nodejs";

const controller = new WalkRouteController(new FootWalkRouter());

// Street path for the selected place. Thin Next entry, rules live in FootWalkRouter.
export async function GET(request: NextRequest) {
  return controller.handle(request);
}
