"use client";

import { useState } from "react";

const KINDS: { value: string; label: string }[] = [
  { value: "access", label: "Access my data" },
  { value: "correct", label: "Correct something" },
  { value: "export", label: "Export my data (specific format)" },
  { value: "delete", label: "Delete my account" },
  { value: "complaint", label: "Make a privacy complaint" },
  { value: "other", label: "Other" },
];

export function PrivacyRequestForm() {
  const [kind, setKind] = useState("access");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/privacy-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        if (data.error === "rate_limited") {
          throw new Error(
            "You've sent a few requests recently. Please wait a while before sending another."
          );
        }
        throw new Error("Couldn't send. Please try again.");
      }
      setSent(true);
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-900">Request sent.</p>
        <p className="mt-1 text-sm text-emerald-900/80">
          We&apos;ll get back to you within 30 days (usually much sooner). If
          it&apos;s urgent, you can also email{" "}
          <a
            href="mailto:privacy@theadultinglife.com.au"
            className="underline"
          >
            privacy@theadultinglife.com.au
          </a>{" "}
          directly.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-3 text-sm text-emerald-900 underline"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-xs uppercase tracking-widest text-tal-plum-soft mb-1">
          Type of request
        </span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="w-full h-11 rounded-xl border border-tal-line px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tal-plum/40"
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="block text-xs uppercase tracking-widest text-tal-plum-soft mb-1">
          Tell us more (optional)
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Any details that will help us action your request."
          className="w-full rounded-xl border border-tal-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tal-plum/40"
        />
      </label>
      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-tal-plum-soft">
          Sent to <strong>privacy@theadultinglife.com.au</strong>. We reply
          within 30 days.
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send request"}
        </button>
      </div>
    </div>
  );
}
