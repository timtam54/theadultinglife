import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getOrder, updateOrder } from "@/lib/shop/db";
import { getStripe } from "@/lib/stripe/server";

// POST — Admin → Shop orders: refund an order in full. Refunds the card
// payment in Stripe, then marks the order refunded (its download links stop
// working). { markOnly: true } skips Stripe — for a payment already refunded
// in the Stripe dashboard, or an order paid outside Stripe.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== "s") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const { markOnly } = (await request.json().catch(() => ({}))) as { markOnly?: boolean };
  const order = await getOrder((await params).id);
  if (!order || !["paid", "fulfilled"].includes(order.status)) {
    return NextResponse.json({ message: "This order can't be refunded." }, { status: 404 });
  }

  if (!markOnly) {
    if (!order.stripe_payment_intent_id) {
      return NextResponse.json(
        { message: "This order wasn't paid through Stripe, so there's no card payment to refund. Use “Just mark refunded”." },
        { status: 409 }
      );
    }
    try {
      await getStripe().refunds.create(
        { payment_intent: order.stripe_payment_intent_id, metadata: { shop_order_id: order.id, refunded_by: session.user.id } },
        // A double click can't refund twice.
        { idempotencyKey: `shop-refund-${order.id}` }
      );
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "charge_already_refunded") {
        console.error("[admin/shop/refund]", order.id, e);
        const message =
          code === "resource_missing"
            ? "Stripe can't find this payment (it may be from test mode). Use “Just mark refunded” if it's already been refunded."
            : (e as { message?: string }).message ?? "Stripe couldn't refund this payment.";
        return NextResponse.json({ message }, { status: 502 });
      }
    }
  }

  await updateOrder(order.id, { status: "refunded" });
  return NextResponse.json({ ok: true });
}
