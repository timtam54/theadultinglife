// Notifies a grantee that they've been given access to an item in someone's
// Peace of Mind Planner. Stubbed to console when SMTP env vars are absent
// (matches password-email.ts).

import nodemailer from "nodemailer";

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

export async function sendGrantNotificationEmail(input: {
  ownerName: string;
  granteeEmail: string | null;
  granteeName: string;
  itemLabel: string;
}): Promise<void> {
  if (!input.granteeEmail) return;
  const to = input.granteeEmail;
  const subject = `${input.ownerName} has shared something with you in The Adulting Life`;
  const link = `${APP_URL}/templates/peace-of-mind-planner`;
  const greeting = input.granteeName ? `Hi ${input.granteeName},` : "Hi,";
  const body = `${greeting}

${input.ownerName} has shared ${input.itemLabel} with you in their Peace of Mind Planner.

You can view it any time by signing in:
${link}

They can remove your access at any time. This message is a notification only — reply to ${input.ownerName} directly if you have questions.

— The Adulting Life`;

  const t = transporter();
  if (!t) {
    console.log("[item-access-email] STUB — SMTP not configured");
    console.log(`  to: ${to}`);
    console.log(`  subject: ${subject}`);
    console.log(`  body: ${body}`);
    return;
  }

  await t.sendMail({
    from: process.env.EMAIL_USER!,
    to,
    subject,
    text: body,
  });
}
