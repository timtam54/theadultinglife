"use client";

import { useState } from "react";
import { GuardedLink as Link } from "@/components/GuardedLink";

// "Use in my budget" on a wages summary — puts its take-home pay, for the
// budget's period, on the budget's "Wages / salary" line.

export function WagesToBudget({ instanceId, targetUserId }: { instanceId: string; targetUserId?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function use() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/budget/from-wages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instanceId, targetUserId }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        amount?: number;
        period?: string;
        budgetName?: string;
      };
      if (!res.ok) {
        setMessage(body.message ?? "Couldn't update the budget. Please try again.");
        return;
      }
      setDone(true);
      setMessage(
        `Wages / salary in “${body.budgetName}” is now ${Number(body.amount).toLocaleString("en-AU", { style: "currency", currency: "AUD" })} ${body.period}.`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={use}
        disabled={busy}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
        title="Put this take-home pay on your budget's Wages / salary line"
      >
        {busy ? "Updating…" : "Use in my budget"}
      </button>
      {message && <span className="text-xs text-tal-plum-soft">{message}</span>}
      {done && (
        <Link
          href={`/records/admin/admin.budgets${targetUserId ? `?user=${encodeURIComponent(targetUserId)}` : ""}`}
          className="text-sm text-tal-plum underline underline-offset-2"
        >
          Open budget →
        </Link>
      )}
    </div>
  );
}
