import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { renderPlannerPdf } from "@/lib/services/planner-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

/** GET /api/planner/pdf?startIso&endIso&label&timeZone — the Daily Routine
 *  Planner for that period as a PDF ("Download PDF"; Share PDF emails the
 *  same document). */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const p = request.nextUrl.searchParams;
    const startIso = p.get("startIso") ?? "";
    const endIso = p.get("endIso") ?? "";
    if (Number.isNaN(Date.parse(startIso)) || Number.isNaN(Date.parse(endIso))) {
      return NextResponse.json({ error: "bad_range" }, { status: 400 });
    }
    const ownerName =
      [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") || session.user.name || "";
    const pdf = await renderPlannerPdf({
      userId: session.user.id,
      ownerName,
      startIso,
      endIso,
      label: (p.get("label") ?? "").slice(0, 80),
      timeZone: p.get("timeZone") ?? "Australia/Sydney",
    });
    return new NextResponse(Buffer.from(pdf.bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${pdf.filename.replace(/"/g, "")}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[api/planner/pdf] failed:", e);
    return NextResponse.json({ error: "pdf_failed" }, { status: 500 });
  }
}
