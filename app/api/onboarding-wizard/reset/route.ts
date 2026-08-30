import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { resetWizardStatus } from "@/lib/services/onboarding-wizard";

// Clears wizard_seen_at, wizard_completed_at and wizard_steps for the current
// user. Next /dashboard visit will force-redirect to /welcome and the guide
// starts from step 1.
export async function POST() {
  const session = await requireSession();
  await resetWizardStatus(session.user.id);
  return NextResponse.json({ ok: true });
}
