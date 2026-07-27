import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";

// Whisper API limit is 25MB. Browser MediaRecorder chunks are typically
// well under this for short dictations.
const MAX_BYTES = 25 * 1024 * 1024;

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await requireSession();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI is not configured on this server." },
        { status: 503 }
      );
    }

    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "audio_required" }, { status: 400 });
    }
    if (audio.size > MAX_BYTES) {
      return NextResponse.json({ error: "audio_too_large" }, { status: 400 });
    }

    // Whisper accepts multipart/form-data with the raw audio file. Forward
    // exactly what the browser recorded (webm/opus, mp4, or wav).
    const upstream = new FormData();
    upstream.append("file", audio, audio.name || "recording.webm");
    upstream.append("model", "whisper-1");
    upstream.append("response_format", "json");

    const res = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: upstream,
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "transcribe_failed", detail },
        { status: 502 }
      );
    }
    const body = (await res.json()) as { text?: string };
    return NextResponse.json({ text: body.text ?? "" });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:transcribe.POST", e);
  }
}
