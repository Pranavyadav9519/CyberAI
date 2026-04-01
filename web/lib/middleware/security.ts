import { NextRequest, NextResponse } from "next/server";

type Handler = (req: NextRequest) => Promise<NextResponse>;

// ── In-memory rate limiter (per IP, 60 req / minute) ────────────────────────
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = Number(process.env.RATE_LIMIT_RPM ?? 60);
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── API key check (optional — skip if API_KEY env not set) ──────────────────
function checkApiKey(req: NextRequest): boolean {
  const requiredKey = process.env.CYBERAI_API_KEY;
  if (!requiredKey) return true; // not configured → open access
  const provided =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return provided === requiredKey;
}

// ── CORS helper ─────────────────────────────────────────────────────────────
function corsHeaders(): Record<string, string> {
  const origin = process.env.CORS_ORIGIN ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key, X-CyberAI-Admin",
  };
}

// ── Composed middleware ──────────────────────────────────────────────────────
export function withSecurity(handler: Handler): Handler {
  return async (req: NextRequest) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders() });
    }

    // Rate limit
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: corsHeaders() }
      );
    }

    // API key gate
    if (!checkApiKey(req)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders() }
      );
    }

    const res = await handler(req);
    // Attach CORS headers to response
    Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  };
}
