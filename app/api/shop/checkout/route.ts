import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe/server";
import { insertOrder, updateOrder } from "@/lib/shop/db";
import { completeOrder, gstOf, orderItemsFor, orderPageUrl, priceCart, token, MAX_QUANTITY } from "@/lib/shop/orders";

export const runtime = "nodejs";

// POST — guest checkout. Prices the cart from the database, creates the
// order (pending) and, unless it's free, a Stripe PaymentIntent for the
// browser to confirm. The webhook (or the thank-you page) marks it paid.

const Body = z.object({
  cart: z
    .array(z.object({ productId: z.uuid(), quantity: z.number().int().min(1).max(MAX_QUANTITY) }))
    .min(1)
    .max(30),
  email: z.email().max(200),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional(),
  address: z
    .object({
      line1: z.string().trim().min(1).max(200),
      line2: z.string().trim().max(200).optional(),
      suburb: z.string().trim().min(1).max(100),
      state: z.string().trim().min(1).max(20),
      postcode: z.string().trim().regex(/^\d{4}$/),
    })
    .optional(),
  newsletter: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Please check your details and try again." }, { status: 400 });
  }
  const b = parsed.data;

  const cart = await priceCart(b.cart);
  if (!cart) {
    return NextResponse.json(
      { message: "Something in your cart is no longer available. Please refresh the shop and try again." },
      { status: 409 }
    );
  }
  if (cart.needsAddress && !b.address) {
    return NextResponse.json({ message: "Please enter a delivery address." }, { status: 400 });
  }

  const free = cart.totalCents === 0;
  const address = cart.needsAddress ? b.address : undefined;
  const order = await insertOrder(
    {
      access_key: token(),
      status: "pending",
      email: b.email.trim().toLowerCase(),
      name: b.name,
      phone: b.phone || null,
      ship_line1: address?.line1 ?? null,
      ship_line2: address?.line2 || null,
      ship_suburb: address?.suburb ?? null,
      ship_state: address?.state ?? null,
      ship_postcode: address?.postcode ?? null,
      total_cents: cart.totalCents,
      gst_cents: gstOf(cart.totalCents),
      newsletter_opt_in: b.newsletter,
      paid_at: null,
    },
    orderItemsFor(cart)
  );

  if (free) {
    await completeOrder(order.id);
    return NextResponse.json({ orderUrl: orderPageUrl(order) });
  }

  const intent = await getStripe().paymentIntents.create({
    amount: cart.totalCents,
    currency: "aud",
    // Card covers Apple Pay and Google Pay too.
    allowed_payment_method_types: ["card"],
    description: `The Adulting Life shop order #${order.order_number}`,
    metadata: { shop_order_id: order.id, order_number: String(order.order_number) },
    ...(address
      ? {
          shipping: {
            name: b.name,
            phone: b.phone || undefined,
            address: {
              line1: address.line1,
              line2: address.line2 || undefined,
              city: address.suburb,
              state: address.state,
              postal_code: address.postcode,
              country: "AU",
            },
          },
        }
      : {}),
  });
  await updateOrder(order.id, { stripe_payment_intent_id: intent.id });

  return NextResponse.json({ clientSecret: intent.client_secret, orderUrl: orderPageUrl(order) });
}
