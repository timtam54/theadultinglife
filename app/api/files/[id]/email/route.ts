import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { getSignedDownloadForGranteeOrFamily } from "@/lib/services/files";
import { createSignedDownloadUrl } from "@/lib/supabase/storage";
import { createServiceClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/services/mailer";
import { rateLimit } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Graph's limit is ~4 MB per message once encoded; bigger files go as a link.
const MAX_ATTACH_BYTES = 3 * 1024 * 1024;
const LINK_DAYS = 7;

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/files/:id/email — body { toEmail, message? }. Emails one
 *  uploaded document to a recipient: attached when small enough, otherwise
 *  as a private link that works for 7 days. Replies go to the sender. */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    if (!rateLimit(`file-email:${session.user.id}`, 20, 3600_000).allowed) {
      return NextResponse.json(
        { error: "rate_limited", message: "You've sent a lot of emails in the last hour. Please try again later." },
        { status: 429 }
      );
    }
    const body = (await request.json().catch(() => ({}))) as { toEmail?: unknown; message?: unknown };
    const toEmail = typeof body.toEmail === "string" ? body.toEmail.trim() : "";
    if (!EMAIL_RE.test(toEmail)) {
      return NextResponse.json({ error: "invalid_email", message: "Please enter a valid email address." }, { status: 400 });
    }
    const note = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";

    // Same access rules as viewing: the family's own files, or ones shared
    // with this person. Throws not_found otherwise.
    const signedUrl = await getSignedDownloadForGranteeOrFamily(session.user.id, session.user.familyGroupId, id);
    const { data: meta } = await createServiceClient()
      .from("file_objects")
      .select("filename, mime_type, size_bytes, storage_path")
      .eq("id", id)
      .maybeSingle();
    const file = meta as { filename: string; mime_type: string | null; size_bytes: number; storage_path: string } | null;
    if (!file) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const senderName =
      [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") ||
      session.user.name ||
      "An Adulting Life user";
    const intro = `${senderName} has sent you a document from The Adulting Life: ${file.filename}`;

    if (file.size_bytes <= MAX_ATTACH_BYTES) {
      const res = await fetch(signedUrl);
      if (!res.ok) throw new Error("file_download_failed");
      const content = Buffer.from(await res.arrayBuffer());
      await sendMail("file-email", {
        to: toEmail,
        replyTo: session.user.email ?? undefined,
        subject: `${file.filename} — from ${senderName}`,
        text: [intro, note ? `\nMessage from ${senderName}:\n${note}` : "", "\nThe document is attached."].join("\n"),
        attachments: [{ filename: file.filename, content, contentType: file.mime_type ?? "application/octet-stream" }],
      });
      return NextResponse.json({ ok: true, sentAs: "attachment" });
    }

    const link = await createSignedDownloadUrl(file.storage_path, LINK_DAYS * 24 * 60 * 60);
    await sendMail("file-email", {
      to: toEmail,
      replyTo: session.user.email ?? undefined,
      subject: `${file.filename} — from ${senderName}`,
      text: [
        intro,
        note ? `\nMessage from ${senderName}:\n${note}` : "",
        `\nThe document is too large to attach, so here's a private link to download it (works for ${LINK_DAYS} days):\n${link}`,
      ].join("\n"),
    });
    return NextResponse.json({ ok: true, sentAs: "link" });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    console.error("[api/files/email] failed:", e);
    return NextResponse.json(
      { error: "email_failed", message: "Couldn't send the email. Please try again." },
      { status: 500 }
    );
  }
}
