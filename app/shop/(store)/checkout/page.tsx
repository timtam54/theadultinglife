"use client";

import Link from "next/link";
import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { appearance, getStripeJs, TestModeNotice } from "@/components/StripeCardDialog";
import { formatPrice, useCart } from "@/components/shop/cart";

// Guest checkout: details first, then the Stripe card form (card, Apple
// Pay, Google Pay). Free orders skip payment.

const STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
const input = "w-full h-11 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum";

export default function CheckoutPage() {
  const cart = useCart();
  const [details, setDetails] = useState({
    email: "",
    name: "",
    phone: "",
    line1: "",
    line2: "",
    suburb: "",
    state: "",
    postcode: "",
    newsletter: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<{ clientSecret: string; orderUrl: string } | null>(null);
  const stripe = getStripeJs();
  const set = (k: keyof typeof details) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDetails((d) => ({ ...d, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function continueToPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cart: cart.items.map((i) => ({ productId: i.id, quantity: i.quantity })),
          email: details.email,
          name: details.name,
          phone: details.phone || undefined,
          address: cart.needsAddress
            ? {
                line1: details.line1,
                line2: details.line2 || undefined,
                suburb: details.suburb,
                state: details.state,
                postcode: details.postcode,
              }
            : undefined,
          newsletter: details.newsletter,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { clientSecret?: string; orderUrl?: string; message?: string };
      if (!res.ok || !body.orderUrl) throw new Error(body.message ?? "Something went wrong. Please try again.");
      if (!body.clientSecret) {
        // Free order — nothing to pay.
        cart.clear();
        window.location.href = body.orderUrl;
        return;
      }
      setPayment({ clientSecret: body.clientSecret, orderUrl: body.orderUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (cart.items.length === 0 && !payment) {
    return (
      <div className="text-center">
        <h1 className="font-display text-3xl text-tal-plum">Checkout</h1>
        <p className="mt-4 text-tal-plum-soft">Your cart is empty.</p>
        <Link href="/shop" className="mt-6 inline-flex h-11 items-center rounded-xl bg-black px-6 text-sm font-medium text-white">
          Back to the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div>
        <h1 className="font-display text-3xl text-tal-plum">Checkout</h1>
        {!payment ? (
          <form onSubmit={continueToPayment} className="mt-6 space-y-4 rounded-2xl border border-tal-line bg-white p-5">
            <p className="text-sm text-tal-plum-soft">No account needed — we just need a few details.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-tal-plum-soft">Full name</span>
                <input required value={details.name} onChange={set("name")} autoComplete="name" className={input} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-tal-plum-soft">Email</span>
                <input required type="email" value={details.email} onChange={set("email")} autoComplete="email" className={input} />
              </label>
            </div>
            {cart.needsAddress && (
              <>
                <h2 className="pt-2 font-medium text-tal-plum">Delivery address</h2>
                <label className="block">
                  <span className="mb-1 block text-xs text-tal-plum-soft">Address</span>
                  <input required value={details.line1} onChange={set("line1")} autoComplete="address-line1" className={input} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-tal-plum-soft">Apartment, unit etc. (optional)</span>
                  <input value={details.line2} onChange={set("line2")} autoComplete="address-line2" className={input} />
                </label>
                <div className="grid gap-3 sm:grid-cols-[1fr_7rem_7rem]">
                  <label className="block">
                    <span className="mb-1 block text-xs text-tal-plum-soft">Suburb</span>
                    <input required value={details.suburb} onChange={set("suburb")} autoComplete="address-level2" className={input} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-tal-plum-soft">State</span>
                    <select required value={details.state} onChange={set("state")} autoComplete="address-level1" className={input}>
                      <option value="" />
                      {STATES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-tal-plum-soft">Postcode</span>
                    <input
                      required
                      inputMode="numeric"
                      pattern="\d{4}"
                      maxLength={4}
                      value={details.postcode}
                      onChange={set("postcode")}
                      autoComplete="postal-code"
                      className={input}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs text-tal-plum-soft">Phone (optional, for delivery)</span>
                  <input type="tel" value={details.phone} onChange={set("phone")} autoComplete="tel" className={input} />
                </label>
                <p className="text-xs text-tal-plum-soft">We post within Australia. Postage is included in the price.</p>
              </>
            )}
            <label className="flex items-start gap-2 text-sm text-tal-plum">
              <input type="checkbox" checked={details.newsletter} onChange={set("newsletter")} className="mt-0.5" />
              Send me The Adulting Life newsletter with tips and news.
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-black text-sm font-medium text-white disabled:opacity-60">
              {busy ? "Please wait…" : cart.totalCents === 0 ? "Get my download" : "Continue to payment"}
            </button>
          </form>
        ) : !stripe ? (
          <p className="mt-6 text-sm text-red-700">Payments aren&rsquo;t set up yet (missing Stripe key).</p>
        ) : (
          <div className="mt-6 rounded-2xl border border-tal-line bg-white p-5">
            <Elements stripe={stripe} options={{ clientSecret: payment.clientSecret, appearance }}>
              <PayForm orderUrl={payment.orderUrl} totalCents={cart.totalCents} onPaid={cart.clear} onBack={() => setPayment(null)} />
            </Elements>
          </div>
        )}
      </div>
      <OrderSummary />
    </div>
  );
}

function PayForm({
  orderUrl,
  totalCents,
  onPaid,
  onBack,
}: {
  orderUrl: string;
  totalCents: number;
  onPaid: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: payError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: orderUrl },
    });
    if (payError) {
      setError(payError.message ?? "Your payment didn't go through. Please try again.");
      setBusy(false);
      return;
    }
    onPaid();
    window.location.href = orderUrl;
  }

  return (
    <form onSubmit={pay} className="space-y-4">
      <TestModeNotice />
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: { applePay: "auto", googlePay: "auto" },
          defaultValues: { billingDetails: { address: { country: "AU" } } },
        }}
      />
      <p className="text-xs text-tal-plum-soft">Your card is processed securely by Stripe. We never see or store your card number.</p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="h-11 rounded-xl border border-tal-line px-4 text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
        >
          Back
        </button>
        <button type="submit" disabled={!stripe || busy} className="h-11 flex-1 rounded-xl bg-black text-sm font-medium text-white disabled:opacity-60">
          {busy ? "Processing…" : `Pay ${formatPrice(totalCents)}`}
        </button>
      </div>
    </form>
  );
}

function OrderSummary() {
  const { items, totalCents } = useCart();
  return (
    <aside className="h-fit rounded-2xl border border-tal-line bg-white p-5">
      <h2 className="font-medium text-tal-plum">Your order</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3">
            <span className="text-tal-plum">
              {i.quantity > 1 && `${i.quantity} × `}
              {i.name}
            </span>
            <span className="shrink-0 text-tal-plum">{formatPrice(i.price_cents * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between border-t border-tal-line pt-3 text-base text-tal-plum">
        <span>Total</span>
        <strong>{formatPrice(totalCents)}</strong>
      </div>
      {totalCents > 0 && <p className="mt-1 text-xs text-tal-plum-soft">Includes GST of {formatPrice(Math.round(totalCents / 11))}</p>}
    </aside>
  );
}
