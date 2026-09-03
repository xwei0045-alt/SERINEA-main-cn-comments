import { NextResponse } from "next/server";
import { Environment } from "@/backend/config/Environment";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { ReachServiceFactory } from "@/backend/factories/ReachServiceFactory";

export const runtime = "nodejs";

/**
 * Lightweight liveness check. Omits data-source / DB detail from the public body
 * (security report: info disclosure on /api/health).
 */
export async function GET() {
  try {
    const environment = Environment.getInstance();
    const service = ReachServiceFactory.create();
    const repositoryHealthy = await service.isHealthy();
    let databaseOk = true;

    if (environment.databaseUrl) {
      const connection = PostgresDatabase.getInstance(environment.databaseUrl);
      databaseOk = await connection.isHealthy();
    }

    const healthy =
      repositoryHealthy &&
      (environment.dataSource !== "database" || databaseOk);

    return NextResponse.json(
      {
        status: healthy ? "ok" : "degraded",
        checkedAt: new Date().toISOString()
      },
      { status: healthy ? 200 : 503 }
    );
  } catch (error) {
    console.error("Health check failed.", error);
    return NextResponse.json(
      {
        status: "error",
        checkedAt: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
