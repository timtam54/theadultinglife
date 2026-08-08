import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";
import { getSquareClient } from "@/lib/square/client";

interface UpdateCardBody {
  sourceId?: string;
  cardholderName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const user = await findUserById(session.user.id);
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const customerId = user.square_customer_id;
    const subscriptionId = user.square_subscription_id;
    if (!customerId || !subscriptionId) {
      return NextResponse.json(
        { error: "no_subscription" },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => null)) as UpdateCardBody | null;
    if (!body?.sourceId) {
      return NextResponse.json({ error: "source_id_required" }, { status: 400 });
    }

    const client = getSquareClient();

    // 1. Save the new card on the customer.
    const cardResp = await client.cards.create({
      idempotencyKey: `card-${randomUUID()}`,
      sourceId: body.sourceId,
      card: {
        customerId,
        cardholderName: body.cardholderName ?? user.name ?? undefined,
        referenceId: user.id,
      },
    });
    const newCardId = cardResp.card?.id;
    if (!newCardId) {
      return NextResponse.json(
        { error: "card_create_failed", errors: cardResp.errors },
        { status: 502 }
      );
    }

    // 2. Point the subscription at the new card. Square's update endpoint
    //    treats unset fields as "leave unchanged", so only cardId is sent.
    const updateResp = await client.subscriptions.update({
      subscriptionId,
      subscription: { cardId: newCardId },
    });
    if (!updateResp.subscription?.id) {
      return NextResponse.json(
        { error: "subscription_update_failed", errors: updateResp.errors },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, cardId: newCardId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
