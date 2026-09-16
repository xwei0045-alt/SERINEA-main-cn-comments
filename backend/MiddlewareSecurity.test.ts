import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { middleware, resetRateLimitForTests } from "@/middleware";

function request(authorization?: string): NextRequest {
  return new NextRequest("http://localhost/api/incentives", {
    headers: authorization ? { authorization } : undefined
  });
}

test("Basic Auth protects API routes with environment credentials", () => {
  const previousUsername = process.env.BASIC_AUTH_USERNAME;
  const previousPassword = process.env.BASIC_AUTH_PASSWORD;
  process.env.BASIC_AUTH_USERNAME = "reviewer";
  process.env.BASIC_AUTH_PASSWORD = "private-test-secret";

  try {
    assert.equal(middleware(request()).status, 401);
    const wrong = Buffer.from("reviewer:wrong").toString("base64");
    assert.equal(middleware(request(`Basic ${wrong}`)).status, 401);
    const valid = Buffer.from("reviewer:private-test-secret").toString("base64");
    assert.equal(middleware(request(`Basic ${valid}`)).status, 200);
  } finally {
    if (previousUsername === undefined) delete process.env.BASIC_AUTH_USERNAME;
    else process.env.BASIC_AUTH_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.BASIC_AUTH_PASSWORD;
    else process.env.BASIC_AUTH_PASSWORD = previousPassword;
  }
});

test("Basic Auth fails closed when review credentials are absent", () => {
  const previousUsername = process.env.BASIC_AUTH_USERNAME;
  const previousPassword = process.env.BASIC_AUTH_PASSWORD;
  delete process.env.BASIC_AUTH_USERNAME;
  delete process.env.BASIC_AUTH_PASSWORD;
  try {
    assert.equal(middleware(request()).status, 503);
  } finally {
    if (previousUsername !== undefined) process.env.BASIC_AUTH_USERNAME = previousUsername;
    if (previousPassword !== undefined) process.env.BASIC_AUTH_PASSWORD = previousPassword;
  }
});

test("API limiter uses a true rolling 60-second window", () => {
  const previousUsername = process.env.BASIC_AUTH_USERNAME;
  const previousPassword = process.env.BASIC_AUTH_PASSWORD;
  const originalNow = Date.now;
  process.env.BASIC_AUTH_USERNAME = "reviewer";
  process.env.BASIC_AUTH_PASSWORD = "private-test-secret";
  const valid = Buffer.from("reviewer:private-test-secret").toString("base64");
  let now = 1_000_000;
  Date.now = () => now;
  resetRateLimitForTests();

  const walkRequest = () => new NextRequest("http://localhost/api/walk", {
    headers: { authorization: `Basic ${valid}`, "x-forwarded-for": "203.0.113.9" }
  });

  try {
    for (let index = 0; index < 15; index += 1) assert.equal(middleware(walkRequest()).status, 200);
    now += 30_000;
    for (let index = 0; index < 15; index += 1) assert.equal(middleware(walkRequest()).status, 200);
    assert.equal(middleware(walkRequest()).status, 429);

    now += 31_000;
    for (let index = 0; index < 15; index += 1) assert.equal(middleware(walkRequest()).status, 200);
    const limited = middleware(walkRequest());
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("Retry-After"), "29");
  } finally {
    Date.now = originalNow;
    resetRateLimitForTests();
    if (previousUsername === undefined) delete process.env.BASIC_AUTH_USERNAME;
    else process.env.BASIC_AUTH_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.BASIC_AUTH_PASSWORD;
    else process.env.BASIC_AUTH_PASSWORD = previousPassword;
  }
});
