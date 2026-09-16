import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Bucket = { requestTimes: number[] };

/** Per-instance sliding window. Good enough for coursework / demo abuse control. */
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const LIMITS: Record<string, number> = {
  walk: 30,
  reach: 120,
  localities: 120,
  compare: 60,
  health: 60
};
const DEFAULT_LIMIT = 80;

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "anon";
  return request.headers.get("x-real-ip") || "anon";
}

function routeBucket(pathname: string): string {
  const part = pathname.replace(/^\/api\//, "").split("/")[0] || "api";
  return part;
}

function allow(key: string, limit: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const requestTimes = (buckets.get(key)?.requestTimes ?? [])
    .filter((timestamp) => timestamp > cutoff);

  if (requestTimes.length >= limit) {
    buckets.set(key, { requestTimes });
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((requestTimes[0] + WINDOW_MS - now) / 1000))
    };
  }

  requestTimes.push(now);
  buckets.set(key, { requestTimes });
  return { ok: true, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
}

// Trim the map occasionally so long-lived instances do not grow forever.
function maybePrune(now: number) {
  if (buckets.size < 500) return;
  for (const [key, value] of buckets) {
    if (!value.requestTimes.some((timestamp) => timestamp > now - WINDOW_MS)) buckets.delete(key);
  }
}

/** Clears process-local limiter state for deterministic middleware tests. */
export function resetRateLimitForTests() {
  buckets.clear();
}

export function middleware(request: NextRequest) {
  // Read review credentials from the environment so secrets never enter Git.
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!username || !password) {
    return new NextResponse("Authentication is not configured.", { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  let credentials: [string, string] | null = null;
  if (authorization?.startsWith("Basic ")) {
    try {
      const decoded = atob(authorization.slice("Basic ".length));
      const separator = decoded.indexOf(":");
      if (separator >= 0) credentials = [decoded.slice(0, separator), decoded.slice(separator + 1)];
    } catch {
      credentials = null;
    }
  }

  if (!credentials || credentials[0] !== username || credentials[1] !== password) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
      },
    });
  }

  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const route = routeBucket(request.nextUrl.pathname);
  const limit = LIMITS[route] ?? DEFAULT_LIMIT;
  const key = `${clientKey(request)}:${route}`;
  maybePrune(Date.now());
  const result = allow(key, limit);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Try again shortly."
        }
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSec),
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(limit));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|editorial|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
