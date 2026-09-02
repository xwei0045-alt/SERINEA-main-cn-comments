import type { NextRequest } from "next/server";
import { LocalitySummaryController } from "@/backend/controllers/LocalitySummaryController";
import { LocalitySummaryServiceFactory } from "@/backend/factories/LocalitySummaryServiceFactory";

export const runtime = "nodejs";

const controller = new LocalitySummaryController(LocalitySummaryServiceFactory.create());

/** Returns searchable statistics from the supplied locality summary file. */
export async function GET(request: NextRequest) {
  return controller.handle(request);
}
