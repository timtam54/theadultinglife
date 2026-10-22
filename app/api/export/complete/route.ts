import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { createCompleteExport } from "@/lib/services/complete-export";
import { sendExportReadyEmail } from "@/lib/services/complete-export/email";

// Large families with many documents can take a while to package.
export const maxDuration = 300;

/** POST /api/export/complete — builds the complete organiser download
 *  (branded PDF + Excel workbook + every uploaded document, zipped) and
 *  returns a private link valid for 24 hours. Also emails the link. */
export async function POST() {
  try {
    const session = await requireSession();
    if (!rateLimit(`export-complete:${session.user.id}`, 5, 3600_000).allowed) {
      return NextResponse.json(
        { error: "rate_limited", message: "You've downloaded a few times already. Try again in an hour." },
        { status: 429 }
      );
    }
    const result = await createCompleteExport(session.user.familyGroupId);
    if (session.user.email) {
      await sendExportReadyEmail({ email: session.user.email, url: result.url }).catch((e) =>
        console.error("[api/export/complete] email failed:", e)
      );
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/export/complete] failed:", msg);
    const tooLarge = /exceeded the maximum allowed size|payload too large|413/i.test(msg);
    return NextResponse.json(
      {
        error: tooLarge ? "too_large" : "export_failed",
        message: tooLarge
          ? "Your organiser is too large to download in one go. Please contact us and we'll help."
          : "Something went wrong preparing your download. Please try again.",
      },
      { status: tooLarge ? 413 : 500 }
    );
  }
}
