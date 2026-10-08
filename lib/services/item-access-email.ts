// Notifies a grantee that they've been given access to an item in someone's
// Peace of Mind Planner. Stubbed to console when mail env vars are absent
// (see mailer.ts).

import { sendMail } from "./mailer";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  ""
);

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

  await sendMail("item-access-email", { to, subject, text: body });
}
