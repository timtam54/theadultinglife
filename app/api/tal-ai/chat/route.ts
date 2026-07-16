import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      messages?: ChatMessage[];
    };
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length) {
      return NextResponse.json({ error: "no_messages" }, { status: 400 });
    }

    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages,
    });

    return result.toTextStreamResponse();
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:tal-ai.chat", e);
  }
}
