import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { buildDoc, DocNotFound, type DocKind } from "@/lib/services/doc-sources";
import { renderDocPdf } from "@/lib/services/doc-pdf";
import { sendMail } from "@/lib/services/mailer";
import { rateLimit } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/export/doc/email — body { kind, …params, toEmail, message? }.
 *  "Share PDF": emails the same document Download PDF gives. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!rateLimit(`file-email:${session.user.id}`, 20, 3600_000).allowed) {
      return NextResponse.json(
        { error: "rate_limited", message: "You've sent a lot of emails in the last hour. Please try again later." },
        { status: 429 }
      );
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const toEmail = typeof body.toEmail === "string" ? body.toEmail.trim() : "";
    if (!EMAIL_RE.test(toEmail)) {
      return NextResponse.json({ error: "invalid_email", message: "Please enter a valid email address." }, { status: 400 });
    }
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(body)) if (typeof v === "string") params[k] = v;
    const pdf = await renderDocPdf(await buildDoc(session, params.kind as DocKind, params));
    const sender =
      [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") || session.user.name || "An Adulting Life user";
    const note = (params.message ?? "").trim().slice(0, 2000);
    await sendMail("doc-share-email", {
      to: toEmail,
      replyTo: session.user.email ?? undefined,
      subject: `${pdf.filename.replace(/\.pdf$/, "")} — from ${sender}`,
      text: [
        `${sender} has sent you a document from The Adulting Life: ${pdf.filename}`,
        note ? `\nMessage from ${sender}:\n${note}` : "",
        "\nThe PDF is attached.",
      ].join("\n"),
      attachments: [{ filename: pdf.filename, content: Buffer.from(pdf.bytes), contentType: "application/pdf" }],
    });
    return NextResponse.json({ ok: true, sentAs: "attachment" });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (e instanceof DocNotFound) return NextResponse.json({ error: "not_found" }, { status: 404 });
    console.error("[api/export/doc/email] failed:", e);
    return NextResponse.json({ error: "email_failed", message: "Couldn't send the email. Please try again." }, { status: 500 });
  }
}
