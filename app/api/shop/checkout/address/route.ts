import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getStripe } from "@/lib/stripe/server";
import { getOrder, updateOrder } from "@/lib/shop/db";

export const runtime = "nodejs";

// POST — the delivery address from the payment step (Stripe's address box,
// with address search), saved on the order and its PaymentIntent just before
// the browser confirms the payment.

const Body = z.object({
  orderId: z.uuid(),
  key: z.string().min(10).max(100),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional(),
  address: z.object({
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).nullish(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(20),
    postal_code: z.string().trim().regex(/^\d{4}$/, "Please enter a 4-digit postcode"),
    country: z.literal("AU"),
  }),
});

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Please check your delivery address." }, { status: 400 });
  }
  const { orderId, key, name, phone, address } = parsed.data;
  const order = await getOrder(orderId);
  if (
    !order ||
    order.status !== "pending" ||
    key.length !== order.access_key.length ||
    !timingSafeEqual(Buffer.from(key), Buffer.from(order.access_key))
  ) {
    return NextResponse.json({ message: "This order can't be changed. Please start checkout again." }, { status: 409 });
  }

  await updateOrder(order.id, {
    name,
    phone: phone || order.phone,
    ship_line1: address.line1,
    ship_line2: address.line2 || null,
    ship_suburb: address.city,
    ship_state: address.state,
    ship_postcode: address.postal_code,
  });
  if (order.stripe_payment_intent_id) {
    await getStripe().paymentIntents.update(order.stripe_payment_intent_id, {
      shipping: {
        name,
        phone: phone || undefined,
        address: {
          line1: address.line1,
          line2: address.line2 || undefined,
          city: address.city,
          state: address.state,
          postal_code: address.postal_code,
          country: "AU",
        },
      },
    });
  }
  return NextResponse.json({ ok: true });
}
