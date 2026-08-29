"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  deletedAt: string;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function AccountDeletionBanner({ deletedAt }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purgeAt = new Date(new Date(deletedAt).getTime() + THIRTY_DAYS_MS);
  const purgeLabel = purgeAt.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const daysRemain = Math.max(
    0,
    Math.ceil((purgeAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  );

  async function restore() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/restore", { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "restore_failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "restore_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-red-100 border-b border-red-300 text-red-900 px-4 md:px-6 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm min-w-0">
          <span className="font-semibold">
            Your account is scheduled for deletion on {purgeLabel}
          </span>{" "}
          <span className="text-red-900/80">
            ({daysRemain} day{daysRemain === 1 ? "" : "s"} left). All your
            data is still here — cancel the deletion to keep your account.
          </span>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-800">{error}</span>
          )}
          <button
            type="button"
            onClick={restore}
            disabled={busy}
            className="h-9 px-4 rounded-lg bg-red-700 text-white text-sm font-medium hover:bg-red-800 disabled:opacity-60"
          >
            {busy ? "Restoring…" : "Cancel deletion"}
          </button>
        </div>
      </div>
    </div>
  );
}
