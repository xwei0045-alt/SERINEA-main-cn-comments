import { NextResponse } from "next/server";
import { Environment } from "@/backend/config/Environment";
import { PostgresDatabase } from "@/backend/database/PostgresDatabase";
import { ReachServiceFactory } from "@/backend/factories/ReachServiceFactory";

export const runtime = "nodejs";

/**
 * Reports application, repository, and database health separately.
 * A missing database is expected while the application is using files.
 */
export async function GET() {
  try {
    const environment = Environment.getInstance();
    const service = ReachServiceFactory.create();
    const repositoryHealthy = await service.isHealthy();
    let database: "not-configured" | "connected" | "unreachable" =
      "not-configured";

    if (environment.databaseUrl) {
      const connection = PostgresDatabase.getInstance(environment.databaseUrl);
      database = (await connection.isHealthy()) ? "connected" : "unreachable";
    }

    const healthy =
      repositoryHealthy &&
      (environment.dataSource !== "database" || database === "connected");

    return NextResponse.json(
      {
        status: healthy ? "ok" : "degraded",
        dataSource: service.dataSource,
        repository: repositoryHealthy ? "ready" : "unavailable",
        database,
        checkedAt: new Date().toISOString()
      },
      { status: healthy ? 200 : 503 }
    );
  } catch (error) {
    console.error("Health check failed.", error);
    return NextResponse.json(
      {
        status: "error",
        message: "The backend configuration is not ready.",
        checkedAt: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
