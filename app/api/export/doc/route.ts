import { NextRequest, NextResponse } from "next/server";
import { attachmentDisposition } from "@/lib/content-disposition";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { buildDoc, DocNotFound, type DocKind } from "@/lib/services/doc-sources";
import { renderDocPdf } from "@/lib/services/doc-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const KINDS = new Set<DocKind>(["section", "emergency", "family", "planner", "planner-section", "planner-shared", "meal-plan", "budget", "logbook", "life-goals"]);

/** GET /api/export/doc?kind=…&… — "Download PDF" for sections, Emergency,
 *  Family Members and the Peace of Mind Planner, in the shared branded
 *  layout. Share PDF emails the same document (/api/export/doc/email). */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const kind = params.kind as DocKind;
    if (!KINDS.has(kind)) return NextResponse.json({ error: "bad_kind" }, { status: 400 });
    const pdf = await renderDocPdf(await buildDoc(session, kind, params));
    return new NextResponse(Buffer.from(pdf.bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": attachmentDisposition(pdf.filename),
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof DocNotFound) return NextResponse.json({ error: "not_found" }, { status: 404 });
    console.error("[api/export/doc] failed:", e);
    return NextResponse.json({ error: "pdf_failed" }, { status: 500 });
  }
}
