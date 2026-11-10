"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

// The in-app payment popup (Stripe Elements). Card details go straight to
// Stripe — never through our server. Used to subscribe, and to change card.
//
// Subscribe: save the card (SetupIntent, with 3-D Secure if the bank asks),
// then start the subscription on it — a 30-day trial with the promo code, or
// the first payment now. The Stripe webhook updates the account straight
// away; the popup also checks the status before closing.

let stripePromise: Promise<Stripe | null> | null = null;
function getStripeJs() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  return (stripePromise ??= loadStripe(key));
}

type Mode =
  | { kind: "subscribe"; plan: "monthly" | "annual"; promoCode: string | null; summary: string }
  | { kind: "update" };

const appearance = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#000000",
    colorText: "#3a2a2e",
    colorDanger: "#b91c1c",
    fontFamily: "system-ui, sans-serif",
    borderRadius: "12px",
  },
};

export function StripeCardDialog({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const stripe = getStripeJs();

  useEffect(() => {
    let live = true;
    (async () => {
      const res = await fetch("/api/stripe/setup", { method: "POST" }).catch(() => null);
      const body = (await res?.json().catch(() => ({}))) as { clientSecret?: string; message?: string } | undefined;
      if (!live) return;
      if (!res?.ok || !body?.clientSecret) setLoadError(body?.message ?? "Couldn't start the payment form. Please try again.");
      else setClientSecret(body.clientSecret);
    })();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = mode.kind === "subscribe" ? "Subscribe to TAL Premium" : "Change your card";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stripe-dialog-title"
      className="fixed inset-0 z-[100000] bg-black/50 flex items-center justify-center p-4 text-left"
    >
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="bg-black text-white px-5 py-4 rounded-t-2xl">
          <h2 id="stripe-dialog-title" className="font-display text-lg">
            {title}
          </h2>
          {mode.kind === "subscribe" && <p className="text-sm text-white/80 mt-0.5">{mode.summary}</p>}
        </div>
        <div className="p-5">
          {!stripe ? (
            <p className="text-sm text-red-700">Payments aren&rsquo;t set up yet (missing Stripe key).</p>
          ) : loadError ? (
            <p role="alert" className="text-sm text-red-700">
              {loadError}
            </p>
          ) : !clientSecret ? (
            <p className="text-sm text-tal-plum-soft">Loading the secure payment form…</p>
          ) : (
            <Elements stripe={stripe} options={{ clientSecret, appearance }}>
              <CardForm mode={mode} onClose={onClose} />
            </Elements>
          )}
          {(!stripe || loadError || !clientSecret) && (
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-xl border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Shown only while the app uses Stripe's test (sandbox) keys. */
function TestModeNotice() {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_")) return null;
  const row = "flex justify-between gap-3";
  return (
    <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-semibold">Test mode — no real money is charged</p>
      <p className="mt-0.5 text-xs">This is a Stripe sandbox. Use this test card:</p>
      <dl className="mt-2 space-y-0.5 font-mono text-xs">
        <div className={row}>
          <dt>Card number</dt>
          <dd className="font-semibold">4242 4242 4242 4242</dd>
        </div>
        <div className={row}>
          <dt>Expiry</dt>
          <dd className="font-semibold">12 / 34</dd>
        </div>
        <div className={row}>
          <dt>CVC</dt>
          <dd className="font-semibold">123</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs">
        Other tests: <span className="font-mono">4000 0025 0000 3155</span> asks for bank approval ·{" "}
        <span className="font-mono">4000 0000 0000 9995</span> is declined.
      </p>
    </div>
  );
}

function CardForm({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function waitForActive() {
    // The webhook usually lands within a second or two; /status also reads
    // Stripe directly, so this settles quickly either way.
    for (let i = 0; i < 8; i++) {
      const res = await fetch("/api/stripe/status").catch(() => null);
      const body = (await res?.json().catch(() => ({}))) as { status?: string } | undefined;
      if (body?.status === "active" || body?.status === "canceled") return true;
      await new Promise((r) => setTimeout(r, 1000));
    }
    return false;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    try {
      const { error: setupError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
        confirmParams: { return_url: window.location.href },
      });
      if (setupError || !setupIntent) throw new Error(setupError?.message ?? "Your card couldn't be saved.");

      if (mode.kind === "update") {
        const res = await fetch("/api/stripe/card", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ setupIntentId: setupIntent.id }),
        });
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        if (!res.ok) throw new Error(body.message ?? "Couldn't update your card.");
        setDone("Your card has been updated.");
      } else {
        const res = await fetch("/api/stripe/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ setupIntentId: setupIntent.id, plan: mode.plan, promoCode: mode.promoCode }),
        });
        const body = (await res.json().catch(() => ({}))) as { status?: string; clientSecret?: string; message?: string };
        if (!res.ok) throw new Error(body.message ?? "Couldn't start your subscription.");
        if (body.status === "requires_action" && body.clientSecret) {
          const { error: payError } = await stripe.confirmPayment({
            clientSecret: body.clientSecret,
            redirect: "if_required",
            confirmParams: { return_url: window.location.href },
          });
          if (payError) throw new Error(payError.message ?? "Your bank didn't approve the payment.");
        }
        await waitForActive();
        setDone(mode.promoCode ? "You're subscribed — enjoy your free month!" : "You're subscribed — thank you!");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <p className="text-tal-plum font-medium">{done}</p>
        <button type="button" onClick={onClose} className="mt-5 h-10 px-5 rounded-xl bg-black text-white text-sm font-medium">
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <TestModeNotice />
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: { applePay: "auto", googlePay: "auto" },
          defaultValues: { billingDetails: { address: { country: "AU" } } },
        }}
      />
      <p className="text-xs text-tal-plum-soft">
        Your card is processed securely by Stripe. The Adulting Life never sees or stores your card number.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="h-10 px-4 rounded-xl border border-tal-line text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
        >
          Cancel
        </button>
        <button type="submit" disabled={!stripe || busy} className="h-10 px-5 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60">
          {busy ? "Processing…" : mode.kind === "subscribe" ? "Subscribe" : "Save card"}
        </button>
      </div>
    </form>
  );
}
