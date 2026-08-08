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

    // 1. Load the plan variation so we can find its phase uid + the eligible item.
    const planResp = await client.catalog.object.get({ objectId: planVariationId });
    const planVariation = planResp.object;
    if (planVariation?.type !== "SUBSCRIPTION_PLAN_VARIATION") {
      return NextResponse.json({ error: "plan_variation_not_found" }, { status: 500 });
    }
    const planPhases = planVariation.subscriptionPlanVariationData?.phases ?? [];
    const firstPhase = planPhases[0];
    if (!firstPhase?.uid) {
      return NextResponse.json({ error: "plan_phase_missing" }, { status: 500 });
    }

    // 2. Find the eligible item on the parent plan, then its first variation.
    const parentPlanId = planVariation.subscriptionPlanVariationData?.subscriptionPlanId;
    if (!parentPlanId) {
      return NextResponse.json({ error: "plan_parent_missing" }, { status: 500 });
    }
    const planParentResp = await client.catalog.object.get({ objectId: parentPlanId });
    const parentPlan = planParentResp.object;
    const eligibleItemId =
      parentPlan?.type === "SUBSCRIPTION_PLAN"
        ? parentPlan.subscriptionPlanData?.eligibleItemIds?.[0]
        : undefined;
    if (!eligibleItemId) {
      return NextResponse.json({ error: "eligible_item_missing" }, { status: 500 });
    }
    const itemResp = await client.catalog.object.get({ objectId: eligibleItemId });
    const item = itemResp.object;
    const itemVariationId =
      item?.type === "ITEM"
        ? item.itemData?.variations?.[0]?.id
        : undefined;
    if (!itemVariationId) {
      return NextResponse.json({ error: "item_variation_missing" }, { status: 500 });
    }

    // 3. Create or reuse a Square Customer for this user.
    let customerId = user.square_customer_id ?? undefined;
    if (!customerId) {
      const created = await client.customers.create({
        idempotencyKey: `c-${randomUUID()}`,
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

    // 4. Save the card on file for that customer.
    const cardResp = await client.cards.create({
      idempotencyKey: `card-${randomUUID()}`,
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

    // 5. Create an order template (DRAFT order) referencing the item variation.
    //    RELATIVE-pricing plans require this so Square knows what to bill for.
    const orderResp = await client.orders.create({
      idempotencyKey: `ord-${randomUUID()}`,
      order: {
        locationId,
        customerId,
        state: "DRAFT",
        lineItems: [
          {
            quantity: "1",
            catalogObjectId: itemVariationId,
          },
        ],
      },
    });
    const orderTemplateId = orderResp.order?.id;
    if (!orderTemplateId) {
      return NextResponse.json(
        { error: "order_template_failed", errors: orderResp.errors },
        { status: 502 }
      );
    }

    // 6. Create the subscription, wiring the plan phase to the order template.
    const subResp = await client.subscriptions.create({
      idempotencyKey: `sub-${randomUUID()}`,
      locationId,
      planVariationId,
      customerId,
      cardId,
      phases: [
        {
          ordinal: BigInt(0),
          orderTemplateId,
        },
      ],
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
