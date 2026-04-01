import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withSecurity } from "@/lib/middleware/security";
import { auditLog } from "@/lib/middleware/audit";

const VOICE_SYSTEM_PROMPT = `You are CyberAI Voice Assistant — a fast, concise cybersecurity expert.
You help with threat intelligence, vulnerability analysis, incident response, CVE lookups,
MITRE ATT&CK techniques, malware analysis, and SOC operations.

IMPORTANT VOICE RULES:
- Keep answers SHORT and CONVERSATIONAL (2-4 sentences max unless detail is requested).
- No markdown, bullet points, or code blocks — plain spoken language only.
- If asked for details or a full explanation, say "I can show you the full analysis in the chat."
- Speak clearly and precisely, like a knowledgeable security analyst briefing a colleague.`;

async function handler(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Voice features require a Gemini API key. Add GEMINI_API_KEY to your environment variables.",
        code: "GEMINI_KEY_MISSING",
      },
      { status: 503 }
    );
  }

  try {
    const body = (await req.json()) as { prompt?: unknown; stream?: unknown };

    if (!body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid prompt" },
        { status: 400 }
      );
    }

    const prompt = body.prompt.slice(0, 2000); // cap input length
    const useStream = body.stream !== false; // stream by default

    // Audit log (non-blocking)
    auditLog({
      type: "voice",
      messageCount: 1,
      timestamp: new Date().toISOString(),
    });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: VOICE_SYSTEM_PROMPT,
    });

    if (useStream) {
      const result = await model.generateContentStream(prompt);

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                );
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (streamErr) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
              )
            );
          } finally {
            controller.close();
          }
        },
      });

      return new NextResponse(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-CyberAI-Version": "0.2.0",
        },
      });
    }

    // Non-streaming fallback
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json(
      { text },
      { headers: { "X-CyberAI-Version": "0.2.0" } }
    );
  } catch (error) {
    console.error("CyberAI voice API error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const POST = withSecurity(handler);
