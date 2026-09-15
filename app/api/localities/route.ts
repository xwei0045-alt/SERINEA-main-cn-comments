import type { NextRequest } from "next/server";
import { LocalitySummaryController } from "@/backend/controllers/LocalitySummaryController";
import { LocalitySummaryServiceFactory } from "@/backend/factories/LocalitySummaryServiceFactory";

export const runtime = "nodejs";

const controller = new LocalitySummaryController(LocalitySummaryServiceFactory.create());

/** Town search from the locality summary CSV. */
// Search database-backed locality summaries for the town picker.
export async function GET(request: NextRequest) {
  return controller.handle(request);
}
