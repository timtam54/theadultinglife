import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";

// AI vision import placeholder.
// When the client picks an AI provider (Anthropic vision is likely), wire it
// up here: read the uploaded file, ask the model to extract field values by
// question_id, and return { answers: { question_id: value, ... } }.
export async function POST(_request: NextRequest) {
  try {
    await requireSession();
    return NextResponse.json(
      { error: "ai_import_not_configured" },
      { status: 501 }
    );
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
