import { sendMail } from "@/lib/services/mailer";

/** Emails the complete-download link so it isn't lost if the person leaves
 *  the page while it's being prepared. The link expires after 24 hours. */
export async function sendExportReadyEmail(input: { email: string; url: string }): Promise<void> {
  const text =
    `Your complete Adulting Life organiser is ready to download:\n\n${input.url}\n\n` +
    `It includes a PDF of your organiser, an Excel workbook with every folder, and all your uploaded documents. ` +
    `The link works for 24 hours. After that, download it again from Settings.\n\n` +
    `The download contains private information — keep it somewhere safe. ` +
    `If you didn't ask for this, change your password and contact us.`;
  await sendMail("export-ready-email", {
    to: input.email,
    subject: "Your organiser download is ready — The Adulting Life",
    text,
  });
}
