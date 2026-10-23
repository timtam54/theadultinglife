import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { renderPlannerPdf } from "@/lib/services/planner-pdf";
import { sendMail } from "@/lib/services/mailer";
import { rateLimit } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/planner/share-email — body { startIso, endIso, label, timeZone,
 *  toEmail, message? }. Emails the Daily Routine Planner for that period as
 *  a PDF. Replies go to the sender. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!rateLimit(`file-email:${session.user.id}`, 20, 3600_000).allowed) {
      return NextResponse.json(
        { error: "rate_limited", message: "You've sent a lot of emails in the last hour. Please try again later." },
        { status: 429 }
      );
    }
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const toEmail = typeof b.toEmail === "string" ? b.toEmail.trim() : "";
    if (!EMAIL_RE.test(toEmail)) {
      return NextResponse.json({ error: "invalid_email", message: "Please enter a valid email address." }, { status: 400 });
    }
    const startIso = typeof b.startIso === "string" ? b.startIso : "";
    const endIso = typeof b.endIso === "string" ? b.endIso : "";
    if (Number.isNaN(Date.parse(startIso)) || Number.isNaN(Date.parse(endIso))) {
      return NextResponse.json({ error: "bad_range" }, { status: 400 });
    }
    const label = typeof b.label === "string" ? b.label.slice(0, 80) : "";
    const timeZone = typeof b.timeZone === "string" ? b.timeZone : "Australia/Sydney";
    const note = typeof b.message === "string" ? b.message.trim().slice(0, 2000) : "";
    const ownerName =
      [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") || session.user.name || "";
    const pdf = await renderPlannerPdf({ userId: session.user.id, ownerName, startIso, endIso, label, timeZone });
    const sender = ownerName || "An Adulting Life user";
    await sendMail("planner-share-email", {
      to: toEmail,
      replyTo: session.user.email ?? undefined,
      subject: `${sender}'s daily routine — ${label}`,
      text: [
        `${sender} has shared their daily routine with you from The Adulting Life (${label}).`,
        note ? `\nMessage from ${sender}:\n${note}` : "",
        "\nThe routine is attached as a PDF.",
      ].join("\n"),
      attachments: [{ filename: pdf.filename, content: Buffer.from(pdf.bytes), contentType: "application/pdf" }],
    });
    return NextResponse.json({ ok: true, sentAs: "attachment" });
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("[api/planner/share-email] failed:", e);
    return NextResponse.json({ error: "email_failed", message: "Couldn't send the email. Please try again." }, { status: 500 });
  }
}
