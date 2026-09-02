import type { NextRequest } from "next/server";
import { ReachController } from "@/backend/controllers/ReachController";
import { ReachServiceFactory } from "@/backend/factories/ReachServiceFactory";

/** PostgreSQL support requires the Node.js runtime rather than the Edge runtime. */
export const runtime = "nodejs";

const controller = new ReachController(ReachServiceFactory.create());

/** Thin Next.js entry. Validation and the 15 minute rule live in backend classes. */
export async function GET(request: NextRequest) {
  return controller.handle(request);
}
