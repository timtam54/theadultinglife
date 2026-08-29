import { NextRequest, NextResponse } from "next/server";
import { WebhooksHelper } from "square";
import {
  findUserBySquareSubscriptionId,
  updateUser,
} from "@/lib/db/users";
import { sendSubscriptionEndedEmails } from "@/lib/services/subscription-ended-email";

interface SquareWebhookEvent {
  type?: string;
  data?: {
    id?: string;
    object?: {
      subscription?: {
        id?: string;
        status?: string;
      };
      invoice?: {
        subscription_id?: string;
      };
    };
  };
}

export async function POST(request: NextRequest) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!signatureKey) {
    return NextResponse.json(
      { error: "webhook_key_missing" },
      { status: 500 }
    );
  }

  const signatureHeader = request.headers.get("x-square-hmacsha256-signature");
  if (!signatureHeader) {
    return NextResponse.json({ error: "no_signature" }, { status: 401 });
  }

  const rawBody = await request.text();
  const notificationUrl = webhookUrl(request);

  const valid = await WebhooksHelper.verifySignature({
    requestBody: rawBody,
    signatureHeader,
    signatureKey,
    notificationUrl,
  });
  if (!valid) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event: SquareWebhookEvent;
  try {
    event = JSON.parse(rawBody) as SquareWebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    console.error("[square/webhook] handler error", event.type, err);
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function webhookUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return `${configured.replace(/\/$/, "")}/api/square/webhook`;
  }
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("host") ?? "localhost";
  return `${proto}://${host}/api/square/webhook`;
}

async function handleEvent(event: SquareWebhookEvent): Promise<void> {
  const type = event.type ?? "";

  if (type === "subscription.created" || type === "subscription.updated") {
    const sub = event.data?.object?.subscription;
    if (!sub?.id) return;
    const user = await findUserBySquareSubscriptionId(sub.id);
    if (!user) return;
    const newStatus = mapSquareStatus(sub.status ?? null);
    const wasActive = user.subscription_status === "active";
    await updateUser(user.id, { subscription_status: newStatus });

    // ACTIVE → CANCELED transition = the paid period actually lapsed after
    // an earlier scheduled cancel. Notify user + admin (fire-and-forget).
    if (wasActive && newStatus === "canceled") {
      void sendSubscriptionEndedEmails({
        userEmail: user.email,
        userName:
          [user.first_name, user.last_name].filter(Boolean).join(" ") ||
          user.name,
        userId: user.id,
      }).catch(() => {
        /* swallow — DB state is already correct */
      });
    }
    return;
  }

  if (type === "invoice.payment_made") {
    const subId = event.data?.object?.invoice?.subscription_id;
    if (!subId) return;
    const user = await findUserBySquareSubscriptionId(subId);
    if (!user) return;
    await updateUser(user.id, { subscription_status: "active" });
    return;
  }

  if (type === "invoice.scheduled_charge_failed") {
    const subId = event.data?.object?.invoice?.subscription_id;
    if (!subId) return;
    const user = await findUserBySquareSubscriptionId(subId);
    if (!user) return;
    await updateUser(user.id, { subscription_status: "delinquent" });
    return;
  }

  // payment.updated & invoice.canceled: no-op for now; subscription.updated is the source of truth.
}

function mapSquareStatus(
  status: string | null
): "none" | "active" | "pending" | "canceled" | "deactivated" | "paused" | "delinquent" {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "PENDING":
      return "pending";
    case "CANCELED":
      return "canceled";
    case "DEACTIVATED":
      return "deactivated";
    case "PAUSED":
      return "paused";
    case "DELINQUENT":
      return "delinquent";
    default:
      return "none";
  }
}
