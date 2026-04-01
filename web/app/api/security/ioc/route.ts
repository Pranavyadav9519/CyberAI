import { NextRequest, NextResponse } from "next/server";
import { withSecurity } from "@/lib/middleware/security";
import { auditLog } from "@/lib/middleware/audit";

/**
 * IOC enrichment endpoint.
 * POST /api/security/ioc
 * Body: { "ioc": "1.2.3.4" | "evil.com" | "<sha256>" }
 *
 * Integrates with VirusTotal if VIRUSTOTAL_API_KEY is set.
 * Falls back to placeholder reputation data.
 */

type IocType = "ip" | "domain" | "hash" | "url" | "unknown";

function detectIocType(ioc: string): IocType {
  if (/^[0-9a-f]{64}$/i.test(ioc)) return "hash"; // SHA-256
  if (/^[0-9a-f]{40}$/i.test(ioc)) return "hash"; // SHA-1
  if (/^[0-9a-f]{32}$/i.test(ioc)) return "hash"; // MD5
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ioc)) return "ip";
  if (/^https?:\/\//i.test(ioc)) return "url";
  if (/^[a-z0-9-]+(\.[a-z]{2,})+$/i.test(ioc)) return "domain";
  return "unknown";
}

async function vtLookup(ioc: string, type: IocType): Promise<Record<string, unknown> | null> {
  const key = process.env.VIRUSTOTAL_API_KEY;
  if (!key) return null;

  const endpoints: Partial<Record<IocType, string>> = {
    ip: `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(ioc)}`,
    domain: `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(ioc)}`,
    hash: `https://www.virustotal.com/api/v3/files/${encodeURIComponent(ioc)}`,
    url: `https://www.virustotal.com/api/v3/urls/${Buffer.from(ioc).toString("base64url")}`,
  };

  const endpoint = endpoints[type];
  if (!endpoint) return null;

  const res = await fetch(endpoint, {
    headers: { "x-apikey": key },
    next: { revalidate: 600 },
  });
  if (!res.ok) return null;
  return res.json();
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  if (!body?.ioc || typeof body.ioc !== "string") {
    return NextResponse.json({ error: 'Body must be { "ioc": "<value>" }' }, { status: 400 });
  }

  const ioc = body.ioc.trim();
  const type = detectIocType(ioc);

  auditLog({ type: "ioc-lookup", isAdmin: false, iocType: type, timestamp: new Date().toISOString() });

  // Try VirusTotal
  const vtData = await vtLookup(ioc, type).catch(() => null);

  if (vtData) {
    return NextResponse.json({ ioc, type, source: "virustotal", data: vtData });
  }

  // Placeholder response when VT key not configured
  return NextResponse.json({
    ioc,
    type,
    source: "placeholder",
    note: "Set VIRUSTOTAL_API_KEY in .env for live enrichment.",
    reputation: {
      score: null,
      malicious: null,
      suspicious: null,
      verdict: "unknown — no enrichment provider configured",
    },
    recommendations: [
      "Check IOC in VirusTotal: https://www.virustotal.com/gui/search/" + encodeURIComponent(ioc),
      "Check in Shodan (IPs): https://www.shodan.io/host/" + (type === "ip" ? ioc : "<ip>"),
      "Check in AbuseIPDB: https://www.abuseipdb.com/check/" + (type === "ip" ? ioc : "<ip>"),
    ],
  });
}

export const POST = withSecurity(handler);
