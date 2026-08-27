import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import {
  createPlannerApology,
  listPlannerApologies,
} from "@/lib/db/planner-apologies";
import { apiError } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await requireSession();
    const apologies = await listPlannerApologies(session.user.id);
    return NextResponse.json({ apologies });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner-apologies.GET", e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      recipient?: string;
      body?: string;
    };
    const apology = await createPlannerApology({
      userId: session.user.id,
      recipient: (body.recipient ?? "").trim(),
      body: (body.body ?? "").trim(),
    });
    return NextResponse.json({ apology }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:planner-apologies.POST", e);
  }
}
