import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { loadOnboardingSummary } from "@/lib/services/onboarding";

export const metadata: Metadata = {
  title: "Tasks to complete",
  description: "Set-up tasks to get the most out of The Adulting Life.",
};

export default async function TasksPage() {
  const session = await requireSession();
  const { tasks, doneCount, totalCount, pct } = await loadOnboardingSummary(
    session.user.id,
    session.user.familyGroupId
  );

  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-br from-tal-plum to-tal-plum-dark text-white px-6 py-4 mb-6 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
            Tasks
          </span>
          <h1 className="font-display text-2xl leading-tight">
            {doneCount === totalCount
              ? "All tasks complete"
              : "Tasks to complete"}
          </h1>
          <span className="text-white/40 mx-1" aria-hidden>·</span>
          <span className="text-sm text-white/80">
            {doneCount} of {totalCount} done · {pct}%
          </span>
        </div>
      </div>

      <section className="rounded-2xl border border-tal-line bg-white p-6">
        <div className="h-2 rounded-full bg-tal-cream overflow-hidden mb-4">
          <div
            className="h-full bg-tal-plum transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link
                href={t.href}
                className={
                  "flex items-center gap-3 rounded-xl border p-3 transition " +
                  (t.done
                    ? "border-green-100 bg-green-50/50 text-tal-plum-soft"
                    : "border-amber-200 bg-amber-50/60 text-tal-plum hover:shadow-sm")
                }
              >
                <span
                  className={
                    "inline-flex h-6 w-6 items-center justify-center rounded-full shrink-0 " +
                    (t.done
                      ? "bg-green-600 text-white"
                      : "bg-amber-100 text-amber-900")
                  }
                >
                  {t.done ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M5 12l4 4 10-10"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M12 8v5"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle cx="12" cy="16.5" r="1.25" fill="currentColor" />
                    </svg>
                  )}
                </span>
                <span
                  className={
                    "flex-1 text-sm " +
                    (t.done ? "line-through" : "font-medium")
                  }
                >
                  {t.label}
                </span>
                {!t.done && (
                  <span className="text-tal-plum-soft text-sm">→</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
