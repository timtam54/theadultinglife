import webpush from "web-push";
import {
  deletePushSubscription,
  listAllPushSubscriptions,
  listPushSubscriptionsForUser,
  type PushSubscriptionRow,
} from "@/lib/db/push-subscriptions";

let configured = false;
function configure() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:hello@theadultinglife.com.au";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys missing (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

async function sendToRow(
  row: PushSubscriptionRow,
  payload: PushPayload
): Promise<"ok" | "gone" | "error"> {
  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      },
      JSON.stringify(payload)
    );
    return "ok";
  } catch (e: unknown) {
    const err = e as { statusCode?: number; body?: string };
    // 404 or 410 mean the subscription is dead — clean it up.
    if (err.statusCode === 404 || err.statusCode === 410) {
      await deletePushSubscription(row.user_id, row.endpoint);
      return "gone";
    }
    return "error";
  }
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; gone: number; errors: number }> {
  configure();
  const rows = await listPushSubscriptionsForUser(userId);
  let sent = 0;
  let gone = 0;
  let errors = 0;
  for (const row of rows) {
    const r = await sendToRow(row, payload);
    if (r === "ok") sent++;
    else if (r === "gone") gone++;
    else errors++;
  }
  return { sent, gone, errors };
}

export async function sendPushToAll(
  perUser: (userId: string) => Promise<PushPayload | null>
): Promise<{ users: number; sent: number; gone: number; errors: number }> {
  configure();
  const rows = await listAllPushSubscriptions();
  const byUser = new Map<string, PushSubscriptionRow[]>();
  for (const r of rows) {
    const list = byUser.get(r.user_id) ?? [];
    list.push(r);
    byUser.set(r.user_id, list);
  }
  let users = 0;
  let sent = 0;
  let gone = 0;
  let errors = 0;
  for (const [userId, subs] of byUser) {
    const payload = await perUser(userId);
    if (!payload) continue;
    users++;
    for (const row of subs) {
      const r = await sendToRow(row, payload);
      if (r === "ok") sent++;
      else if (r === "gone") gone++;
      else errors++;
    }
  }
  return { users, sent, gone, errors };
}
