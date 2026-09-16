import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

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
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    };
  }

  existing.count += 1;
  return { ok: true, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
}

// Trim the map occasionally so long-lived instances do not grow forever.
function maybePrune(now: number) {
  if (buckets.size < 500) return;
  for (const [key, value] of buckets) {
    if (now >= value.resetAt) buckets.delete(key);
  }
}

export function middleware(request: NextRequest) {
  // Basic Authentication
  const basicAuth = request.headers.get('authorization');
  let isAuthenticated = false;

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // Username and password for the website
    if (user === 'admin' && pwd === 'password123') {
      isAuthenticated = true;
    }
  }

  if (!isAuthenticated) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|Images/).*)"]
};
