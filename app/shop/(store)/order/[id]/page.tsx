import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { getStripe } from "@/lib/stripe/server";
import { getOrder } from "@/lib/shop/db";
import { completeOrder, downloadUrl, money } from "@/lib/shop/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ key?: string }> };

const sameKey = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// The thank-you page, and the buyer's link back to their order (from the
// receipt email). The ?key= in the link is what lets them in.
export default async function OrderPage({ params, searchParams }: Props) {
  const [{ id }, { key }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let order = await getOrder(id);
  if (!order || !key || !sameKey(key, order.access_key)) notFound();

  // Usually the webhook has already marked it paid; if the buyer got here
  // first, check with Stripe directly.
  if (order.status === "pending" && order.stripe_payment_intent_id) {
    const intent = await getStripe().paymentIntents.retrieve(order.stripe_payment_intent_id).catch(() => null);
    if (intent?.status === "succeeded") {
      await completeOrder(order.id);
      order = (await getOrder(id))!;
    }
  }

  const paid = order.status === "paid" || order.status === "fulfilled";
  const downloads = order.items.filter((i) => i.download_token);
  const emailed = order.items.filter((i) => i.kind === "manual");
  const posted = order.items.some((i) => i.kind === "post");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-tal-line bg-white p-6 lg:p-8">
        {paid ? (
          <>
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
            <h1 className="font-display text-3xl text-tal-plum">Thank you, {order.name.split(" ")[0]}!</h1>
            <p className="mt-2 text-tal-plum-soft">
              Order #{order.order_number} — a receipt has been emailed to {order.email}.
            </p>
          </>
        ) : order.status === "pending" ? (
          <>
            <h1 className="font-display text-3xl text-tal-plum">Waiting for payment</h1>
            <p className="mt-2 text-tal-plum-soft">
              Order #{order.order_number} hasn&rsquo;t been paid yet. If you&rsquo;ve just paid, refresh this page in a moment.
            </p>
          </>
        ) : (
          <h1 className="font-display text-3xl text-tal-plum">Order #{order.order_number} was {order.status}</h1>
        )}

        {paid && downloads.length > 0 && (
          <section className="mt-6">
            <h2 className="font-medium text-tal-plum">Your downloads</h2>
            <ul className="mt-2 space-y-2">
              {downloads.map((i) => (
                <li key={i.id}>
                  <a
                    href={downloadUrl(i.download_token!)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-tal-line px-4 py-3 text-sm text-tal-plum hover:bg-tal-cream-soft"
                  >
                    <span>{i.name}</span>
                    <span className="font-medium">Download</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-tal-plum-soft">These links are also in your receipt email, so you can download again later.</p>
          </section>
        )}
        {paid && emailed.length > 0 && (
          <p className="mt-6 text-sm text-tal-plum">
            {emailed.map((i) => i.name).join(", ")} will be emailed to you within 24 hours.
          </p>
        )}
        {paid && posted && (
          <section className="mt-6 text-sm text-tal-plum">
            <h2 className="font-medium">{order.status === "fulfilled" ? "Posted to" : "We'll post your order to"}</h2>
            <p className="mt-1 whitespace-pre-line text-tal-plum-soft">
              {[order.name, order.ship_line1, order.ship_line2, `${order.ship_suburb} ${order.ship_state} ${order.ship_postcode}`]
                .filter(Boolean)
                .join("\n")}
            </p>
          </section>
        )}

        <section className="mt-6 border-t border-tal-line pt-4 text-sm">
          <ul className="space-y-1">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 text-tal-plum">
                <span>
                  {i.quantity > 1 && `${i.quantity} × `}
                  {i.name}
                </span>
                <span>{money(i.unit_price_cents * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between text-base text-tal-plum">
            <span>Total</span>
            <strong>{money(order.total_cents)}</strong>
          </div>
          {order.total_cents > 0 && <p className="text-xs text-tal-plum-soft">Includes GST of {money(order.gst_cents)}</p>}
        </section>
      </div>
      <div className="mt-6 text-center">
        <Link href="/shop" className="text-sm text-tal-plum-soft hover:underline">
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
