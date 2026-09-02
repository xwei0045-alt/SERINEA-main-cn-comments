import type { NextRequest } from "next/server";
import { LocalitySummaryController } from "@/backend/controllers/LocalitySummaryController";
import { CsvDatasetLoader } from "@/backend/data/CsvDatasetLoader";
import { LocalitySummaryService } from "@/backend/services/LocalitySummaryService";

export const runtime = "nodejs";

const controller = new LocalitySummaryController(
  new LocalitySummaryService(new CsvDatasetLoader())
);

/** Returns searchable statistics from the supplied locality summary file. */
export async function GET(request: NextRequest) {
  return controller.handle(request);
}
