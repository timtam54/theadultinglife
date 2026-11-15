import { createHash } from "node:crypto";

// Adds shop customers who ticked "send me the newsletter" to Donna's
// Mailchimp audience, tagged "Shop customer". Only ever with their consent.
// Needs MAILCHIMP_API_KEY (ends in the data centre, e.g. "-us19") and
// MAILCHIMP_AUDIENCE_ID; does nothing without them.

export async function addToMailchimp(input: { email: string; name: string; tags: string[] }): Promise<void> {
  const key = process.env.MAILCHIMP_API_KEY;
  const audience = process.env.MAILCHIMP_AUDIENCE_ID;
  if (!key || !audience) {
    console.log(`[mailchimp] STUB — not configured; would add ${input.email}`);
    return;
  }
  const dc = key.split("-")[1];
  const email = input.email.trim().toLowerCase();
  const member = createHash("md5").update(email).digest("hex");
  const base = `https://${dc}.api.mailchimp.com/3.0/lists/${audience}/members/${member}`;
  const headers = { Authorization: `Basic ${Buffer.from(`x:${key}`).toString("base64")}`, "Content-Type": "application/json" };
  const [first, ...rest] = input.name.trim().split(/\s+/);

  // Add or update. Someone who unsubscribed earlier isn't re-subscribed.
  const res = await fetch(base, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      email_address: email,
      status_if_new: "subscribed",
      merge_fields: { FNAME: first ?? "", LNAME: rest.join(" ") },
    }),
  });
  if (!res.ok) throw new Error(`[mailchimp] add failed (${res.status}): ${(await res.text()).slice(0, 300)}`);

  const tagged = await fetch(`${base}/tags`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tags: input.tags.map((name) => ({ name, status: "active" })) }),
  });
  if (!tagged.ok) console.error("[mailchimp] tagging failed", tagged.status, (await tagged.text()).slice(0, 300));
}
