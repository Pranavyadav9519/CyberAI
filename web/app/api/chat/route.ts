import { NextRequest, NextResponse } from "next/server";
import { withSecurity } from "@/lib/middleware/security";
import { auditLog } from "@/lib/middleware/audit";
import { CYBER_SYSTEM_PROMPT, CYBER_SYSTEM_PROMPT_ADMIN } from "@/lib/cyberprompt";
import { ADMIN_MAX_MESSAGE_LENGTH, MAX_MESSAGE_LENGTH } from "@/lib/constants";

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();

    // Admin bypass via header (validated in middleware)
    const isAdmin = req.headers.get("x-cyberai-admin") === process.env.ADMIN_SECRET;
    const maxLen = isAdmin ? ADMIN_MAX_MESSAGE_LENGTH : MAX_MESSAGE_LENGTH;

    // Input size guard
    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > maxLen * 2) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    // Inject system prompt
    const systemPrompt = isAdmin ? CYBER_SYSTEM_PROMPT_ADMIN : CYBER_SYSTEM_PROMPT;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const payload = {
      ...body,
      system: systemPrompt,
    };

    // Audit log (non-blocking)
    auditLog({
      type: "chat",
      isAdmin,
      messageCount: Array.isArray(body.messages) ? body.messages.length : 0,
      timestamp: new Date().toISOString(),
    });

    const response = await fetch(`${apiUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.ANTHROPIC_API_KEY
          ? { Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}` }
          : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Backend request failed" },
        { status: response.status }
      );
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
        "X-CyberAI-Version": "0.2.0",
      },
    });
  } catch (error) {
    console.error("CyberAI chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const POST = withSecurity(handler);
