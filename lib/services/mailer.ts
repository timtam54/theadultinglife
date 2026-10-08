// Shared outbound mail sender. Sends through Microsoft Graph as the
// MS_MAIL_FROM mailbox using the "The Adulting Life Mailer" app registration
// (client-credentials flow, Mail.Send application permission).
//
// Stubs to console when the MS_MAIL_* env vars are absent, so local dev and
// preview deployments without mail credentials keep working.

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";

// Graph rejects sendMail requests over ~4 MB, and attachments are base64
// encoded inline (~33% larger), so cap the raw attachment bytes at 3 MB.
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}

export class MailTooLargeError extends Error {
  constructor() {
    super("Attachments are too large to email (limit 3 MB in total).");
    this.name = "MailTooLargeError";
  }
}

function config() {
  const tenantId = process.env.MS_MAIL_TENANT_ID;
  const clientId = process.env.MS_MAIL_CLIENT_ID;
  const clientSecret = process.env.MS_MAIL_CLIENT_SECRET;
  const from = process.env.MS_MAIL_FROM;
  if (!tenantId || !clientId || !clientSecret || !from) return null;
  return { tenantId, clientId, clientSecret, from };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(c: NonNullable<ReturnType<typeof config>>): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const res = await fetch(
    `https://login.microsoftonline.com/${c.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      body: new URLSearchParams({
        client_id: c.clientId,
        client_secret: c.clientSecret,
        scope: GRAPH_SCOPE,
        grant_type: "client_credentials",
      }),
    }
  );
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      `[mailer] token request failed (${res.status}): ${json.error ?? "unknown"} ${json.error_description ?? ""}`
    );
  }
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

// Returns true when the message was handed to Graph, false when stubbed.
// `tag` labels the console output so stubbed sends are traceable to a feature.
export async function sendMail(tag: string, input: MailInput): Promise<boolean> {
  const attachments = input.attachments ?? [];
  const c = config();
  if (!c) {
    console.log(`[${tag}] STUB — MS_MAIL_* not configured`);
    console.log(`  to: ${input.to}`);
    console.log(`  subject: ${input.subject}`);
    if (attachments.length > 0) {
      console.log(`  attachments: ${attachments.length}`);
    }
    console.log(`  body: ${input.text}`);
    return false;
  }

  const attachmentBytes = attachments.reduce((n, a) => n + a.content.length, 0);
  if (attachmentBytes > MAX_ATTACHMENT_BYTES) throw new MailTooLargeError();

  const token = await accessToken(c);
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(c.from)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: input.subject,
          body: { contentType: "Text", content: input.text },
          toRecipients: [{ emailAddress: { address: input.to } }],
          replyTo: input.replyTo
            ? [{ emailAddress: { address: input.replyTo } }]
            : undefined,
          attachments: attachments.map((a) => ({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: a.filename,
            contentType: a.contentType,
            contentBytes: a.content.toString("base64"),
          })),
        },
        saveToSentItems: true,
      }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`[mailer] sendMail failed (${res.status}): ${detail.slice(0, 500)}`);
  }
  return true;
}
