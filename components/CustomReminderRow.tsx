"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Recurrence } from "@/lib/db/types";

interface Props {
  id: string;
  title: string;
  status: "expired" | "expiring_soon" | "upcoming";
  dueLabel: string;
  recurrence?: Recurrence | null;
  linkedRecord?: { title: string; href: string } | null;
}

export function CustomReminderRow({
  id,
  title,
  status,
  dueLabel,
  recurrence,
  linkedRecord,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/custom-reminders/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function dismiss(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Remove reminder "${title}"?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/custom-reminders/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-tal-line bg-white p-4">
        <div className="min-w-0 flex items-center gap-2">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800 shrink-0"
            title="Custom reminder"
          >
            CUSTOM
          </span>
          <div className="min-w-0">
            <div className="font-medium text-tal-plum truncate flex items-center gap-2">
              <span className="truncate">{title}</span>
              {recurrence && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 shrink-0 uppercase tracking-wider"
                  title={`Repeats ${recurrence}`}
                >
                  {recurrence}
                </span>
              )}
            </div>
            <div className="text-xs text-tal-plum-soft mt-0.5">{dueLabel}</div>
            {linkedRecord && (
              <a
                href={linkedRecord.href}
                className="text-xs text-tal-plum-soft hover:text-tal-plum underline mt-0.5 inline-block"
              >
                → {linkedRecord.title}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={
              "text-xs rounded-full px-2 py-0.5 " +
              (status === "expired"
                ? "bg-red-100 text-red-800"
                : status === "expiring_soon"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-tal-cream-soft text-tal-plum-soft")
            }
          >
            {status === "expired"
              ? "Expired"
              : status === "expiring_soon"
                ? "Soon"
                : "Upcoming"}
          </span>
          <button
            type="button"
            onClick={() => patch({ snoozeDays: 7 })}
            disabled={busy}
            title="Snooze 7 days"
            className="text-tal-plum-soft hover:text-tal-plum h-8 px-2 rounded-lg hover:bg-tal-cream-soft disabled:opacity-60 text-xs"
          >
            Snooze
          </button>
          <button
            type="button"
            onClick={() => patch({ completed: true })}
            disabled={busy}
            title="Mark done"
            className="text-emerald-700 hover:text-emerald-900 h-8 px-2 rounded-lg hover:bg-emerald-50 disabled:opacity-60 text-xs"
          >
            Done
          </button>
          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            aria-label="Remove reminder"
            className="text-tal-plum-soft hover:text-red-700 h-8 w-8 rounded-lg hover:bg-red-50 disabled:opacity-60"
          >
            ×
          </button>
        </div>
      </div>
    </li>
  );
}
