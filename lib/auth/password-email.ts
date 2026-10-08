// Password reset / setup email sender.
// Sends via the shared Graph mailer, which logs to the server console instead
// when the MS_MAIL_* env vars are absent.

import { sendMail } from "@/lib/services/mailer";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

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

  await sendMail("password-email", { to: input.email, subject, text: body });
}
