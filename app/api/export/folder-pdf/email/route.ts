import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { isUserInFamilyGroup } from "@/lib/db/users";
import { renderFolderFormPdf } from "@/lib/services/folder-pdf";
import { sendMail } from "@/lib/services/mailer";
import { rateLimit } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/export/folder-pdf/email — body { subcategoryId, targetUserId?,
 *  instanceId?, toEmail, message? }. Builds the folder form's PDF (e.g. Will & Funeral
 *  Instructions) and emails it as an attachment. Replies go to the sender. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!rateLimit(`file-email:${session.user.id}`, 20, 3600_000).allowed) {
      return NextResponse.json(
        { error: "rate_limited", message: "You've sent a lot of emails in the last hour. Please try again later." },
        { status: 429 }
      );
    }
    const body = (await request.json().catch(() => ({}))) as {
      subcategoryId?: unknown;
      targetUserId?: unknown;
      instanceId?: unknown;
      toEmail?: unknown;
      message?: unknown;
    };
    const subcategoryId = typeof body.subcategoryId === "string" ? body.subcategoryId : "";
    const toEmail = typeof body.toEmail === "string" ? body.toEmail.trim() : "";
    if (!subcategoryId) return NextResponse.json({ error: "bad_body" }, { status: 400 });
    if (!EMAIL_RE.test(toEmail)) {
      return NextResponse.json({ error: "invalid_email", message: "Please enter a valid email address." }, { status: 400 });
    }
    // Whose form: yourself, or a family member's.
    let ownerUserId = session.user.id;
    if (typeof body.targetUserId === "string" && body.targetUserId && body.targetUserId !== session.user.id) {
      if (!(await isUserInFamilyGroup(body.targetUserId, session.user.familyGroupId))) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      ownerUserId = body.targetUserId;
    }
    const note = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
    const instanceId = typeof body.instanceId === "string" && body.instanceId ? body.instanceId : null;
    const pdf = await renderFolderFormPdf({ ownerUserId, subcategoryId, instanceId });

    const senderName =
      [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") ||
      session.user.name ||
      "An Adulting Life user";
    await sendMail("folder-pdf-email", {
      to: toEmail,
      replyTo: session.user.email ?? undefined,
      subject: `${pdf.filename.replace(/\.pdf$/, "")} — from ${senderName}`,
      text: [
        `${senderName} has sent you a document from The Adulting Life: ${pdf.filename}`,
        note ? `\nMessage from ${senderName}:\n${note}` : "",
        "\nThe PDF is attached. It's an unofficial record for personal reference only — not a government-issued document.",
      ].join("\n"),
      attachments: [{ filename: pdf.filename, content: Buffer.from(pdf.bytes), contentType: "application/pdf" }],
    });
    return NextResponse.json({ ok: true, sentAs: "attachment" });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    console.error("[api/export/folder-pdf/email] failed:", e);
    return NextResponse.json({ error: "email_failed", message: "Couldn't send the email. Please try again." }, { status: 500 });
  }
}
