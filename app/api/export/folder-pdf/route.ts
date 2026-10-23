import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { isUserInFamilyGroup } from "@/lib/db/users";
import { renderFolderFormPdf } from "@/lib/services/folder-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

/** GET /api/export/folder-pdf?subcategoryId=…[&targetUserId=…][&instanceId=…]
 *  The branded PDF of a folder's form (or one entry) — the same document
 *  "Share PDF" emails — for "Download PDF". */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const p = request.nextUrl.searchParams;
    const subcategoryId = p.get("subcategoryId") ?? "";
    if (!subcategoryId) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    let ownerUserId = session.user.id;
    const target = p.get("targetUserId");
    if (target && target !== session.user.id) {
      if (!(await isUserInFamilyGroup(target, session.user.familyGroupId))) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      ownerUserId = target;
    }
    const pdf = await renderFolderFormPdf({ ownerUserId, subcategoryId, instanceId: p.get("instanceId") });
    return new NextResponse(Buffer.from(pdf.bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${pdf.filename.replace(/"/g, "")}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof Error && e.message === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    console.error("[api/export/folder-pdf] failed:", e);
    return NextResponse.json({ error: "pdf_failed" }, { status: 500 });
  }
}
