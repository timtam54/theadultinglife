"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConfirmAgeForm() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/confirm-age", { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "failed");
      }
      router.push("/welcome");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-tal-line text-tal-plum focus:ring-tal-plum/40"
        />
        <span className="text-sm text-tal-plum">
          I confirm that I am 18 years of age or older.
        </span>
      </label>

      {error && (
        <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!confirmed || busy}
        className="mt-5 w-full h-11 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
      >
        {busy ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
