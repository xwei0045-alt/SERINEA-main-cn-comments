import { NextResponse } from "next/server";
import { assistantPredictionSchema, assistantRequestSchema } from "@/lib/assistantPreferences";

export const runtime = "nodejs";

function failure(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  // Hosted serverless runtimes cannot reach a model process on a developer laptop.
  if (process.env.NODE_ENV !== "development") {
    return failure("LOCAL_ONLY", "This AI experiment is available in local development only.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("INVALID_JSON", "Please send valid JSON.", 400);
  }
  const parsed = assistantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return failure("INVALID_MESSAGE", "Please enter between 1 and 500 characters.", 400);
  }

  try {
    // Use a fixed local address; never let user input choose a URL or command.
    const response = await fetch("http://127.0.0.1:8001/predict", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data), cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      return failure("MODEL_ERROR", "The local model could not answer. Use Edit preferences below.", 503);
    }
    const prediction = assistantPredictionSchema.safeParse(await response.json());
    if (!prediction.success) {
      return failure("INVALID_PREDICTION", "The model returned an invalid suggestion. Use Edit preferences below.", 502);
    }
    return NextResponse.json(prediction.data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return failure("MODEL_UNAVAILABLE", "Local AI is unavailable. Start the Python service, or use Edit preferences below.", 503);
  }
}
