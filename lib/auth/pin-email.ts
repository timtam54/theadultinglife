// App PIN emails: a heads-up whenever a PIN is set or changed, and the
// "Forgot PIN" reset link. Sent via the shared Graph mailer, which logs to
// the server console instead when the MS_MAIL_* env vars are absent.

import { sendMail } from "@/lib/services/mailer";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export async function sendPinSetEmail(input: {
  email: string;
  kind: "set" | "changed" | "reset";
}): Promise<void> {
  const what =
    input.kind === "set"
      ? "An app PIN has been set"
      : input.kind === "changed"
        ? "Your app PIN has been changed"
        : "Your app PIN has been reset";
  const when = new Date().toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Sydney",
  });
  const text =
    `${what} on your Adulting Life account (${when}, Sydney time).\n\n` +
    `If this was you, there's nothing more to do.\n\n` +
    `If it wasn't you, open The Adulting Life, choose "Forgot PIN?" on the lock screen to set a new one, ` +
    `and change your sign-in password or contact us:\n\n${APP_URL}`;
  await sendMail("pin-set-email", { to: input.email, subject: `${what} — The Adulting Life`, text });
}

export async function sendPinResetEmail(input: {
  email: string;
  rawToken: string;
}): Promise<void> {
  const link = `${APP_URL}/reset-pin?token=${encodeURIComponent(input.rawToken)}`;
  const text =
    `Someone asked to reset the app PIN on your Adulting Life account.\n\n` +
    `Choose a new PIN using the link below (valid for 1 hour):\n\n${link}\n\n` +
    `If you didn't ask for this, you can ignore this email — your PIN hasn't changed.`;
  await sendMail("pin-reset-email", {
    to: input.email,
    subject: "Reset your Adulting Life app PIN",
    text,
  });
}

export async function sendFaceIdOnEmail(input: {
  email: string;
  deviceLabel: string | null;
}): Promise<void> {
  const where = input.deviceLabel ? ` on a ${input.deviceLabel}` : "";
  const text =
    `Face ID / fingerprint unlock was turned on${where} for your Adulting Life account.\n\n` +
    `If this was you, there's nothing more to do.\n\n` +
    `If it wasn't you, open The Adulting Life, go to Settings → Face ID and remove that device, ` +
    `then change your PIN and sign-in password:\n\n${APP_URL}/settings`;
  await sendMail("face-id-on-email", {
    to: input.email,
    subject: "Face ID unlock turned on — The Adulting Life",
    text,
  });
}
