// Password reset / setup email sender.
// Stubbed for now: logs the setup link to the server console when SMTP env vars
// are absent. When EMAIL_USER + EMAIL_PASSWORD are set, sends via Gmail SMTP
// (matches Moodkin). Swap for Resend/SES later if desired.

import nodemailer from "nodemailer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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

export async function sendPasswordEmail(input: {
  email: string;
  rawToken: string;
  kind: "setup" | "reset";
}): Promise<void> {
  const link = `${APP_URL}/set-password?token=${encodeURIComponent(input.rawToken)}`;
  const subject =
    input.kind === "setup"
      ? "Set your Adulting Life password"
      : "Reset your Adulting Life password";
  const body =
    input.kind === "setup"
      ? `Welcome to The Adulting Life. Set your password using the link below (valid for 24 hours):\n\n${link}`
      : `Reset your Adulting Life password using the link below (valid for 1 hour):\n\n${link}`;

  const t = transporter();
  if (!t) {
    // Dev/stub mode.
    console.log("[password-email] STUB — SMTP not configured");
    console.log(`  to: ${input.email}`);
    console.log(`  subject: ${subject}`);
    console.log(`  link: ${link}`);
    return;
  }

  await t.sendMail({
    from: process.env.EMAIL_USER!,
    to: input.email,
    subject,
    text: body,
  });
}
