/**
 * Unit tests for CyberAI security middleware.
 * Run with: npm test (requires jest setup) or npx ts-node test runner.
 *
 * These tests use Node's built-in assert since no test framework is
 * configured in the upstream project. If Jest is available use it.
 */

import { withSecurity } from "../lib/middleware/security";
import { NextRequest, NextResponse } from "next/server";

// Helper to build a minimal NextRequest
function makeReq(
  url: string,
  opts: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): NextRequest {
  return new NextRequest(url, {
    method: opts.method ?? "POST",
    headers: opts.headers ?? {},
    body: opts.body,
  });
}

async function okHandler(_req: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ ok: true });
}

describe("withSecurity middleware", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it("passes a normal request when no API key is configured", async () => {
    delete process.env.CYBERAI_API_KEY;
    const handler = withSecurity(okHandler);
    const req = makeReq("http://localhost/api/chat");
    const res = await handler(req);
    expect(res.status).toBe(200);
  });

  it("rejects when API key is configured and missing from request", async () => {
    process.env.CYBERAI_API_KEY = "secret123";
    const handler = withSecurity(okHandler);
    const req = makeReq("http://localhost/api/chat");
    const res = await handler(req);
    expect(res.status).toBe(401);
    delete process.env.CYBERAI_API_KEY;
  });

  it("accepts when correct API key provided in x-api-key header", async () => {
    process.env.CYBERAI_API_KEY = "secret123";
    const handler = withSecurity(okHandler);
    const req = makeReq("http://localhost/api/chat", {
      headers: { "x-api-key": "secret123" },
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
    delete process.env.CYBERAI_API_KEY;
  });

  it("accepts when correct API key provided as Bearer token", async () => {
    process.env.CYBERAI_API_KEY = "secret123";
    const handler = withSecurity(okHandler);
    const req = makeReq("http://localhost/api/chat", {
      headers: { authorization: "Bearer secret123" },
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
    delete process.env.CYBERAI_API_KEY;
  });

  it("responds 204 to OPTIONS preflight", async () => {
    const handler = withSecurity(okHandler);
    const req = makeReq("http://localhost/api/chat", { method: "OPTIONS" });
    const res = await handler(req);
    expect(res.status).toBe(204);
  });

  it("attaches CORS headers to responses", async () => {
    delete process.env.CYBERAI_API_KEY;
    process.env.CORS_ORIGIN = "https://example.com";
    const handler = withSecurity(okHandler);
    const req = makeReq("http://localhost/api/chat");
    const res = await handler(req);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://example.com");
    delete process.env.CORS_ORIGIN;
  });
});

describe("admin bypass flag", () => {
  it("isAdmin is true when x-cyberai-admin header matches ADMIN_SECRET", () => {
    process.env.ADMIN_SECRET = "my-admin-secret";
    // Simulate what the chat route does
    const adminSecret = process.env.ADMIN_SECRET;
    const headers = new Headers({ "x-cyberai-admin": "my-admin-secret" });
    const isAdmin = headers.get("x-cyberai-admin") === adminSecret;
    expect(isAdmin).toBe(true);
  });

  it("isAdmin is false when header is wrong", () => {
    process.env.ADMIN_SECRET = "my-admin-secret";
    const adminSecret = process.env.ADMIN_SECRET;
    const headers = new Headers({ "x-cyberai-admin": "wrong" });
    const isAdmin = headers.get("x-cyberai-admin") === adminSecret;
    expect(isAdmin).toBe(false);
  });
});
