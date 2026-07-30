"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface HiddenSuggestionItem {
  subcategoryId: string;
  name: string;
  categoryLabel: string;
  dismissedUntil: string | null;
}

export function HiddenSuggestions({
  items,
}: {
  items: HiddenSuggestionItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (items.length === 0) return null;

  async function restore(subcategoryId: string) {
    setBusyId(subcategoryId);
    try {
      const res = await fetch(
        `/api/folder-dismissals?subcategoryId=${encodeURIComponent(subcategoryId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.refresh();
    } catch {
      // Silent fail — the button re-enables via finally so user can retry.
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-tal-line bg-white p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <div className="font-medium text-tal-plum">
            Show hidden suggestions ({items.length})
          </div>
          <p className="text-xs text-tal-plum-soft mt-0.5">
            Folders you snoozed or marked &ldquo;Not applicable&rdquo;.
          </p>
        </div>
        <span
          className={
            "text-tal-plum-soft text-sm transition-transform " +
            (open ? "rotate-180" : "")
          }
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <ul className="mt-4 space-y-2">
          {items.map((it) => {
            const until = it.dismissedUntil
              ? new Date(it.dismissedUntil).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : null;
            return (
              <li
                key={it.subcategoryId}
                className="flex items-center justify-between gap-3 rounded-xl border border-tal-line p-3"
              >
                <div className="min-w-0">
                  <div className="font-medium text-tal-plum truncate">
                    {it.name}
                  </div>
                  <div className="text-xs text-tal-plum-soft">
                    {it.categoryLabel}
                    {until ? ` · snoozed until ${until}` : " · not applicable"}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busyId === it.subcategoryId}
                  onClick={() => restore(it.subcategoryId)}
                  className="h-8 px-3 rounded-lg border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
                >
                  {busyId === it.subcategoryId ? "…" : "Unhide"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
