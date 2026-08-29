"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  familyGroupId: string;
  primaryLabel: string;
}

export function PurgeFamilyGroupButton({
  familyGroupId,
  primaryLabel,
}: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function purge() {
    if (
      !confirm(
        `Permanently delete ${primaryLabel}'s family group and every family member's data? This CANNOT be undone.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/purge-family-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyGroupId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        result?: { usersDeleted: number; storageBlobsDeleted: number };
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "purge_failed");
      }
      alert(
        `Purged. ${data.result?.usersDeleted ?? 0} users, ${data.result?.storageBlobsDeleted ?? 0} files removed.`
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "purge_failed");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={purge}
        disabled={busy}
        className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-60"
      >
        {busy ? "Purging…" : "Purge family group"}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
      {/* setConfirming is unused visually but keep the state hook for future
          two-step confirm UI if we want it. */}
      {confirming ? null : null}
    </div>
  );
}
