"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PrivacyRequestRow,
  PrivacyRequestStatus,
} from "@/lib/db/privacy-requests";

const KIND_LABEL: Record<string, string> = {
  access: "Access my data",
  correct: "Correct something",
  export: "Export my data",
  delete: "Delete my account",
  complaint: "Privacy complaint",
  other: "Other",
};

const STATUS_OPTIONS: { value: PrivacyRequestStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "responded", label: "Responded" },
  { value: "closed", label: "Closed" },
];

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function PrivacyRequestDetail({
  initial,
}: {
  initial: PrivacyRequestRow;
}) {
  const router = useRouter();
  const [row, setRow] = useState<PrivacyRequestRow>(initial);
  const [status, setStatus] = useState<PrivacyRequestStatus>(row.status);
  const [notes, setNotes] = useState<string>(row.admin_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(markResponded = false) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/privacy-requests/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminNotes: notes,
          markResponded,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        request?: PrivacyRequestRow;
        error?: string;
      };
      if (!res.ok || !data.request) {
        throw new Error(data.error ?? "save_failed");
      }
      setRow(data.request);
      setStatus(data.request.status);
      setNotes(data.request.admin_notes ?? "");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-tal-line bg-white p-6">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-tal-plum-soft">Received</dt>
          <dd>{fmt(row.created_at)}</dd>
          <dt className="text-tal-plum-soft">Type</dt>
          <dd>{KIND_LABEL[row.request_kind] ?? row.request_kind}</dd>
          <dt className="text-tal-plum-soft">From</dt>
          <dd>
            {row.email}
            {row.user_id ? (
              <span className="text-xs text-tal-plum-soft ml-2">
                (user {row.user_id.slice(0, 8)}…)
              </span>
            ) : (
              <span className="text-xs text-tal-plum-soft ml-2">
                (no signed-in user)
              </span>
            )}
          </dd>
          <dt className="text-tal-plum-soft">Responded</dt>
          <dd>{fmt(row.responded_at)}</dd>
        </dl>

        <div className="mt-4 border-t border-tal-line pt-4">
          <div className="text-xs uppercase tracking-widest text-tal-plum-soft mb-2">
            Message from user
          </div>
          <div className="text-sm whitespace-pre-wrap text-tal-plum">
            {row.message || <em className="text-tal-plum-soft">(no message)</em>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-tal-line bg-white p-6 space-y-4">
        <h2 className="font-display text-lg text-tal-plum">Handling</h2>

        <label className="block">
          <span className="block text-xs uppercase tracking-widest text-tal-plum-soft mb-1">
            Status
          </span>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as PrivacyRequestStatus)
            }
            className="h-10 rounded-lg border border-tal-line px-3 text-sm bg-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs uppercase tracking-widest text-tal-plum-soft mb-1">
            Internal notes (not shown to user)
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-tal-line px-3 py-2 text-sm bg-white"
            placeholder="What did we do about this request?"
          />
        </label>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <a
            href={`mailto:${row.email}?subject=Re:%20Your%20privacy%20request%20%23${row.id}`}
            className="text-sm text-tal-plum underline"
          >
            Reply by email →
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={busy}
              className="h-10 px-4 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={busy}
              className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              Mark responded
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
