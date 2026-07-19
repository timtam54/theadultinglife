import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";
import {
  WIZARD_STEP_IDS,
  markStepDone,
  type WizardStepId,
} from "@/lib/services/onboarding-wizard";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => null)) as {
      step?: string;
    } | null;
    const step = body?.step as WizardStepId | undefined;
    if (!step || !WIZARD_STEP_IDS.includes(step)) {
      return NextResponse.json({ error: "invalid_step" }, { status: 400 });
    }
    const state = await markStepDone(session.user.id, step);
    return NextResponse.json({ ok: true, state });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:onboarding-wizard.step.POST", e);
  }
}
