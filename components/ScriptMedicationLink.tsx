"use client";

import { useCallback, useEffect, useState } from "react";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { FileViewerButton } from "@/components/FileViewerButton";

// Copies of Scripts ↔ Medication List, shown on each entry:
// - a script: a "Medication List" dropdown showing the medication it's
//   linked to (change or unlink it, Open it), and "Add to Medication List"
//   when it isn't on the list yet;
// - a medication: "View script" opens the scanned script it came from.

interface LinkStatus {
  onList: Record<string, string>;
  sameName: Record<string, string>;
  medications: { instanceId: string; name: string }[];
  scriptFor: Record<string, { scriptInstanceId: string; label: string; file: { id: string; filename: string; mimeType: string | null } | null }>;
}

// One request per page for every entry on it; cleared after a change.
const cache = new Map<string, Promise<LinkStatus | null>>();
function loadStatus(targetUserId?: string): Promise<LinkStatus | null> {
  const key = targetUserId ?? "";
  if (!cache.has(key)) {
    const qs = targetUserId ? `?targetUserId=${encodeURIComponent(targetUserId)}` : "";
    cache.set(
      key,
      fetch(`/api/scripts/medication-link${qs}`)
        .then((r) => (r.ok ? (r.json() as Promise<LinkStatus>) : null))
        .catch(() => null)
    );
  }
  return cache.get(key)!;
}

const btn =
  "inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60";

export function ScriptMedicationLink({
  folder,
  instanceId,
  targetUserId,
}: {
  folder: "scripts" | "medications";
  instanceId: string;
  targetUserId?: string;
}) {
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void loadStatus(targetUserId).then(setStatus);
  }, [targetUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** No medication: add one from the script (or link a same-name one).
   *  With a medication id: link to exactly that one ("" unlinks). */
  async function add(medicationInstanceId?: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/scripts/medication-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scriptInstanceId: instanceId, targetUserId, medicationInstanceId }),
      });
      const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string };
      if (!res.ok) {
        setMessage(body.message ?? "Couldn't add it. Please try again.");
        return;
      }
      setMessage(
        body.status === "added"
          ? "Added to your Medication List."
          : body.status === "unlinked"
            ? "No longer linked."
            : "Linked."
      );
      cache.delete(targetUserId ?? "");
      refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;

  const medsHref = `/records/health/health.medication_list${targetUserId ? `?user=${encodeURIComponent(targetUserId)}` : ""}`;

  if (folder === "scripts") {
    const linked = status.onList[instanceId] ?? "";
    const same = status.sameName[instanceId];
    const sameMed = same ? status.medications.find((m) => m.instanceId === same) : null;
    return (
      <div className="mt-4 rounded-xl border border-tal-line bg-tal-cream-soft/40 p-3">
        <label htmlFor={`script-med-${instanceId}`} className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
          Medication List
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            id={`script-med-${instanceId}`}
            value={linked}
            disabled={busy}
            onChange={(e) => void add(e.target.value)}
            className="h-9 min-w-[12rem] rounded-xl border border-tal-line bg-white px-2 text-sm text-tal-plum"
          >
            <option value="">— Not linked —</option>
            {status.medications.map((m) => (
              <option key={m.instanceId} value={m.instanceId}>
                {m.name}
              </option>
            ))}
          </select>
          {linked ? (
            <Link href={medsHref} className="text-sm text-tal-plum underline underline-offset-2">
              Open in Medication List →
            </Link>
          ) : sameMed ? (
            <button type="button" onClick={() => void add(sameMed.instanceId)} disabled={busy} className={btn}>
              Link to “{sameMed.name}” on your list
            </button>
          ) : (
            <button type="button" onClick={() => void add()} disabled={busy} className={btn}>
              <span aria-hidden>＋</span>
              {busy ? "Adding…" : "Add to Medication List"}
            </button>
          )}
          {message && <span className="text-xs text-tal-plum-soft">{message}</span>}
        </div>
      </div>
    );
  }

  const script = status.scriptFor[instanceId];
  if (!script) return null;
  const scriptsHref = `/records/health/health.scripts${targetUserId ? `?user=${encodeURIComponent(targetUserId)}` : ""}`;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {script.file ? (
        <FileViewerButton fileId={script.file.id} filename={script.file.filename} mimeType={script.file.mimeType} className={btn}>
          <span aria-hidden>📄</span>
          View script
        </FileViewerButton>
      ) : (
        <Link href={scriptsHref} className="text-sm text-tal-plum underline underline-offset-2">
          Script: {script.label} (no scan uploaded yet)
        </Link>
      )}
    </div>
  );
}
