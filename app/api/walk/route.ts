import type { NextRequest } from "next/server";
import { WalkRouteController } from "@/backend/controllers/WalkRouteController";
import { FootWalkRouter } from "@/backend/services/FootWalkRouter";

export const runtime = "nodejs";

const controller = new WalkRouteController(new FootWalkRouter());

/** Street-following walking route for a selected place. */
export async function GET(request: NextRequest) {
  return controller.handle(request);
}
