import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";
import {
  WIZARD_STEP_IDS,
  loadWizardState,
  markStepDone,
  type WizardStepId,
} from "@/lib/services/onboarding-wizard";
import { logEvent } from "@/lib/services/audits";

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
    const before = await loadWizardState(session.user.id);
    const state = await markStepDone(session.user.id, step);
    if (!before.completedAt && state.completedAt) {
      void logEvent({
        userId: session.user.id,
        email: session.user.email,
        action: "onboarding.completed",
        page: "/api/onboarding-wizard/step",
      });
    }
    return NextResponse.json({ ok: true, state });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:onboarding-wizard.step.POST", e);
  }
}
