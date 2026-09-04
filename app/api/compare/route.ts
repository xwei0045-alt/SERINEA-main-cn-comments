import type { NextRequest } from "next/server";
import { CompareController } from "@/backend/controllers/CompareController";

export const runtime = "nodejs";

const controller = new CompareController();

export async function GET(request: NextRequest) {
  return controller.handle(request);
}
