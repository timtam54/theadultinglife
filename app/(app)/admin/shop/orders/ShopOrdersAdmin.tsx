"use client";

import { useState } from "react";
import type { ShopOrderWithItems } from "@/lib/shop/db";

const money = (cents: number) => (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
const date = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Something Donna has to do: post it, or email the file. */
const needsSending = (o: ShopOrderWithItems) => o.items.some((i) => i.kind === "post" || i.kind === "manual");

export function ShopOrdersAdmin({ initial }: { initial: ShopOrderWithItems[] }) {
  const [orders, setOrders] = useState(initial);
  const [tab, setTab] = useState<"todo" | "all">("todo");
  const todo = orders.filter((o) => o.status === "paid" && needsSending(o));
  const shown = tab === "todo" ? todo : orders;

  async function setSent(o: ShopOrderWithItems, fulfilled: boolean) {
    const res = await fetch(`/api/admin/shop/orders/${o.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fulfilled }),
    });
    if (!res.ok) return;
    setOrders((cur) =>
      cur.map((x) =>
        x.id === o.id
          ? { ...x, status: fulfilled ? "fulfilled" : "paid", fulfilled_at: fulfilled ? new Date().toISOString() : null }
          : x
      )
    );
  }

  return (
    <>
      <div className="mb-4 inline-flex rounded-xl border border-tal-line bg-white p-1">
        {(
          [
            ["todo", `To send (${todo.length})`],
            ["all", `All orders (${orders.length})`],
          ] as const
        ).map(([id, text]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={"no-hover-fx h-9 rounded-lg px-3 text-sm " + (tab === id ? "bg-black text-white" : "text-tal-plum hover:bg-tal-cream-soft")}
          >
            {text}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-tal-plum-soft">{tab === "todo" ? "Nothing to send — all caught up." : "No orders yet."}</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((o) => {
            const posted = o.items.some((i) => i.kind === "post");
            const emailed = o.items.filter((i) => i.kind === "manual");
            return (
              <li key={o.id} className="rounded-2xl border border-tal-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-tal-plum">
                      #{o.order_number} · {o.name} · {money(o.total_cents)}
                    </p>
                    <p className="text-xs text-tal-plum-soft">
                      {date(o.paid_at ?? o.created_at)} ·{" "}
                      <a href={`mailto:${o.email}`} className="underline">
                        {o.email}
                      </a>
                      {o.phone && ` · ${o.phone}`}
                    </p>
                  </div>
                  <StatusBadge order={o} />
                </div>
                <ul className="mt-2 text-sm text-tal-plum">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      {i.quantity > 1 && `${i.quantity} × `}
                      {i.name}
                      <span className="text-tal-plum-soft">
                        {" "}
                        — {i.kind === "download" ? `download${i.download_count ? ` (downloaded ${i.download_count}×)` : ""}` : i.kind === "post" ? "post" : "email the file"}
                      </span>
                    </li>
                  ))}
                </ul>
                {posted && (
                  <p className="mt-2 whitespace-pre-line rounded-xl bg-tal-cream-soft p-3 text-sm text-tal-plum">
                    {[o.name, o.ship_line1, o.ship_line2, `${o.ship_suburb} ${o.ship_state} ${o.ship_postcode}`].filter(Boolean).join("\n")}
                  </p>
                )}
                <p className="mt-2 text-xs text-tal-plum-soft">
                  <a href={`/api/shop/invoice/${o.id}`} target="_blank" className="underline">
                    Invoice (PDF)
                  </a>
                  {o.newsletter_opt_in && " · Wants the newsletter."}
                </p>
                {(o.status === "paid" || o.status === "fulfilled") && (
                  <RefundControl order={o} onRefunded={() => setOrders((cur) => cur.map((x) => (x.id === o.id ? { ...x, status: "refunded" } : x)))} />
                )}
                {needsSending(o) && o.status !== "refunded" && o.status !== "cancelled" && (
                  <div className="mt-3">
                    {o.status === "paid" ? (
                      <button
                        type="button"
                        onClick={() => setSent(o, true)}
                        className="h-9 rounded-xl bg-black px-4 text-sm font-medium text-white"
                      >
                        {posted && emailed.length ? "Mark posted & emailed" : posted ? "Mark posted" : "Mark emailed"}
                      </button>
                    ) : (
                      <button type="button" onClick={() => setSent(o, false)} className="text-sm text-tal-plum-soft underline">
                        Undo — not sent yet
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function StatusBadge({ order }: { order: ShopOrderWithItems }) {
  const sent = order.status === "fulfilled";
  const text =
    order.status === "refunded" || order.status === "cancelled"
      ? order.status[0].toUpperCase() + order.status.slice(1)
      : !needsSending(order)
        ? "Delivered"
        : sent
          ? `Sent ${order.fulfilled_at ? new Date(order.fulfilled_at).toLocaleDateString("en-AU") : ""}`
          : "To send";
  const tone =
    text === "To send"
      ? "bg-amber-100 text-amber-900"
      : text === "Refunded" || text === "Cancelled"
        ? "bg-red-100 text-red-800"
        : "bg-emerald-100 text-emerald-800";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{text}</span>;
}

/** Refund an order: the card payment in Stripe, then the order (downloads
 *  stop). Asks first, inline. */
function RefundControl({ order, onRefunded }: { order: ShopOrderWithItems; onRefunded: () => void }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refund(markOnly: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/shop/orders/${order.id}/refund`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markOnly }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { message?: string } | undefined;
    setBusy(false);
    if (!res?.ok) {
      setError(body?.message ?? "Couldn't refund this order. Please try again.");
      return;
    }
    onRefunded();
  }

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="mt-3 mr-3 text-sm text-red-700 underline">
        Refund
      </button>
    );
  }
  return (
    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
      <p className="font-medium">
        Refund {money(order.total_cents)} to {order.name}?
      </p>
      <p className="mt-1 text-xs">
        {order.stripe_payment_intent_id
          ? "The full amount goes back to their card through Stripe (it can take 5–10 days to show), and their download links stop working. This can't be undone."
          : "This order wasn't paid through Stripe — it will only be marked refunded here."}
      </p>
      {error && (
        <p role="alert" className="mt-2 font-medium text-red-700">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {order.stripe_payment_intent_id && (
          <button
            type="button"
            disabled={busy}
            onClick={() => refund(false)}
            className="h-9 rounded-xl bg-red-700 px-4 font-medium text-white disabled:opacity-60"
          >
            {busy ? "Refunding…" : `Refund ${money(order.total_cents)}`}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => refund(true)}
          className="h-9 rounded-xl border border-red-300 bg-white px-4 text-red-800 disabled:opacity-60"
        >
          {order.stripe_payment_intent_id ? "Already refunded in Stripe — just mark refunded" : "Mark refunded"}
        </button>
        <button type="button" disabled={busy} onClick={() => setAsking(false)} className="h-9 px-2 text-tal-plum-soft underline">
          Don&rsquo;t refund
        </button>
      </div>
    </div>
  );
}
