// Fires when a subscription transitions from ACTIVE to CANCELED (i.e. the
// paid-through period actually lapsed after a user cancelled). Sends one
// email to the user and one to the admin inbox.
//
// Stubs to console when SMTP env vars are absent, same pattern as other
// email helpers.

import nodemailer from "nodemailer";

const ADMIN_INBOX = "hello@theadultinglife.com.au";
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

async function send(to: string, subject: string, body: string): Promise<void> {
  const t = transporter();
  if (!t) {
    console.log("[subscription-ended-email] STUB — SMTP not configured");
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

export async function sendSubscriptionEndedEmails(input: {
  userEmail: string | null;
  userName: string | null;
  userId: string;
}): Promise<void> {
  const displayName = input.userName?.trim() || input.userEmail || "there";

  // User email
  if (input.userEmail) {
    const userSubject = "Your TAL Premium subscription has ended";
    const userBody = `Hi ${displayName},

Your TAL Premium subscription has ended. Your account and all your data are
still here — Premium features are just paused.

Want to restart? It's one click:
${APP_URL}/subscription

If you didn't mean to cancel, no worries — you can also delete your account
entirely from Settings if you're done with the app.

— The Adulting Life`;
    await send(input.userEmail, userSubject, userBody).catch((e) => {
      console.error("[subscription-ended-email] user send failed", e);
    });
  }

  // Admin notification
  const adminSubject = `Churn: ${input.userEmail ?? input.userId} cancelled TAL Premium`;
  const adminBody = `TAL Premium subscription ended.

User: ${input.userEmail ?? "(no email on record)"}
User ID: ${input.userId}

Subscription is now in CANCELED status. No further billing will occur.

Manage in admin:
${APP_URL}/admin/users`;
  await send(ADMIN_INBOX, adminSubject, adminBody).catch((e) => {
    console.error("[subscription-ended-email] admin send failed", e);
  });
}
