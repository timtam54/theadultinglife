// Notify the privacy inbox when a user submits a request. Stubbed to console
// when SMTP env vars are absent (same pattern as password-email.ts).

import nodemailer from "nodemailer";

const PRIVACY_INBOX = "privacy@theadultinglife.com.au";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  ""
);

function transporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

const KIND_LABEL: Record<string, string> = {
  access: "Access my data",
  correct: "Correct something",
  export: "Export my data",
  delete: "Delete my account",
  complaint: "Privacy complaint",
  other: "Other",
};

export async function sendPrivacyRequestEmail(input: {
  requestId: number;
  fromEmail: string;
  fromUserId: string | null;
  kind: string;
  message: string;
}): Promise<void> {
  const kindLabel = KIND_LABEL[input.kind] ?? input.kind;
  const subject = `Privacy request #${input.requestId} — ${kindLabel}`;
  const body = `A privacy request has been submitted in The Adulting Life.

Request ID: ${input.requestId}
Type: ${kindLabel}
From: ${input.fromEmail}
User ID: ${input.fromUserId ?? "(no signed-in user)"}

Message:
${input.message || "(no message provided)"}

Manage in the admin inbox:
${APP_URL}/admin/privacy-requests

Australian Privacy Principles require a substantive response within 30 days.`;

  const t = transporter();
  if (!t) {
    console.log("[privacy-request-email] STUB — SMTP not configured");
    console.log(`  to: ${PRIVACY_INBOX}`);
    console.log(`  subject: ${subject}`);
    console.log(`  body: ${body}`);
    return;
  }
  await t.sendMail({
    from: process.env.EMAIL_USER!,
    to: PRIVACY_INBOX,
    replyTo: input.fromEmail,
    subject,
    text: body,
  });
}
