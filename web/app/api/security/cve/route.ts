import { NextRequest, NextResponse } from "next/server";
import { withSecurity } from "@/lib/middleware/security";
import { auditLog } from "@/lib/middleware/audit";

/**
 * CVE lookup via NVD API 2.0
 * GET /api/security/cve?id=CVE-2024-1234
 * GET /api/security/cve?keyword=log4j&limit=10
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const cveId = searchParams.get("id");
  const keyword = searchParams.get("keyword");
  const limit = Math.min(Number(searchParams.get("limit") ?? 10), 50);

  auditLog({ type: "cve-lookup", isAdmin: false, cveId: cveId ?? undefined, keyword: keyword ?? undefined, timestamp: new Date().toISOString() });

  const nvdApiKey = process.env.NVD_API_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (nvdApiKey) headers["apiKey"] = nvdApiKey;

  try {
    let url: string;
    if (cveId) {
      url = `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cveId)}`;
    } else if (keyword) {
      url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=${limit}`;
    } else {
      return NextResponse.json({ error: "Provide ?id=CVE-xxxx or ?keyword=term" }, { status: 400 });
    }

    const res = await fetch(url, { headers, next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json({ error: `NVD API error: ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("CVE lookup error:", err);
    return NextResponse.json({ error: "CVE lookup failed" }, { status: 500 });
  }
}

export const GET = withSecurity(handler);
