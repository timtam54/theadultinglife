import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";

const MAX_INPUT_CHARS = 8000;

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `You tidy up short pieces of writing for an Australian personal life-admin app.

Rules:
- Keep the same meaning and details. Don't add anything the user didn't say. Don't invent facts.
- Fix spelling and grammar. Tighten wording. Use Australian English (colour, organise, etc.).
- Keep the voice conversational and warm — don't make it corporate or formal.
- Preserve line breaks and lists where the user used them.
- If the input is already clean, return it unchanged.
- Return ONLY the polished text. No preamble, no quotes, no explanation.`;

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "AI is not configured on this server." },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { text?: unknown };
    const raw = typeof body.text === "string" ? body.text : "";
    const text = raw.trim();
    if (!text) {
      return NextResponse.json({ error: "text_required" }, { status: 400 });
    }
    if (text.length > MAX_INPUT_CHARS) {
      return NextResponse.json({ error: "text_too_long" }, { status: 400 });
    }

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      prompt: text,
    });
    return NextResponse.json({ text: result.text.trim() });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:polish-text.POST", e, { code: "polish_failed" });
  }
}
