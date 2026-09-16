import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

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
