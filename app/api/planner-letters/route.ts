import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import {
  createPlannerLetter,
  listPlannerLetters,
} from "@/lib/db/planner-letters";
import { apiError } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await requireSession();
    const letters = await listPlannerLetters(session.user.id);
    return NextResponse.json({ letters });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner-letters.GET", e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      recipient?: string;
      body?: string;
    };
    const letter = await createPlannerLetter({
      userId: session.user.id,
      recipient: (body.recipient ?? "").trim(),
      body: (body.body ?? "").trim(),
    });
    return NextResponse.json({ letter }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner-letters.POST", e);
  }
}
