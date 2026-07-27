"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  title: string;
  status: "expired" | "expiring_soon" | "upcoming";
  dueLabel: string;
}

export function CustomReminderRow({ id, title, status, dueLabel }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

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
            <div className="font-medium text-tal-plum truncate">{title}</div>
            <div className="text-xs text-tal-plum-soft mt-0.5">{dueLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
