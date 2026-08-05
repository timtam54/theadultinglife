import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireSession } from "@/lib/auth/session";
import { findUserById, updateUser } from "@/lib/db/users";
import { getSquareClient, getSquareLocationId } from "@/lib/square/client";

interface SubscribeBody {
  sourceId?: string;
  cardholderName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const planVariationId = process.env.SQUARE_PLAN_VARIATION_ID;
    if (!planVariationId) {
      return NextResponse.json({ error: "plan_not_configured" }, { status: 500 });
    }

    const body = (await request.json().catch(() => null)) as SubscribeBody | null;
    if (!body?.sourceId) {
      return NextResponse.json({ error: "source_id_required" }, { status: 400 });
    }

    if (user.subscription_status === "active") {
      return NextResponse.json({ error: "already_subscribed" }, { status: 409 });
    }

    const client = getSquareClient();
    const locationId = getSquareLocationId();

    let customerId = user.square_customer_id ?? undefined;
    if (!customerId) {
      const created = await client.customers.create({
        idempotencyKey: `cust-${user.id}-${randomUUID()}`,
        givenName: user.first_name ?? undefined,
        familyName: user.last_name ?? undefined,
        emailAddress: user.email ?? undefined,
        referenceId: user.id,
      });
      customerId = created.customer?.id;
      if (!customerId) {
        return NextResponse.json(
          { error: "customer_create_failed", errors: created.errors },
          { status: 502 }
        );
      }
      await updateUser(user.id, { square_customer_id: customerId });
    }

    const cardResp = await client.cards.create({
      idempotencyKey: `card-${user.id}-${randomUUID()}`,
      sourceId: body.sourceId,
      card: {
        customerId,
        cardholderName: body.cardholderName ?? user.name ?? undefined,
        referenceId: user.id,
      },
    });
    const cardId = cardResp.card?.id;
    if (!cardId) {
      return NextResponse.json(
        { error: "card_create_failed", errors: cardResp.errors },
        { status: 502 }
      );
    }

    const subResp = await client.subscriptions.create({
      idempotencyKey: `sub-${user.id}-${randomUUID()}`,
      locationId,
      planVariationId,
      customerId,
      cardId,
    });
    const subscription = subResp.subscription;
    if (!subscription?.id) {
      return NextResponse.json(
        { error: "subscription_create_failed", errors: subResp.errors },
        { status: 502 }
      );
    }

    await updateUser(user.id, {
      square_subscription_id: subscription.id,
      subscription_status: mapSquareStatus(subscription.status ?? null),
    });

    return NextResponse.json({
      ok: true,
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
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
