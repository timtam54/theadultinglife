import Link from "next/link";
import type { Nudge } from "@/lib/services/nudges";

export function NudgesCard({ nudges }: { nudges: Nudge[] }) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-700 shrink-0"
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3 2 20h20L12 3Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path
              d="M12 10v4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="12" cy="17" r="1" fill="currentColor" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg text-tal-plum leading-tight">
            A few things need your attention
          </h2>
          <p className="text-xs text-tal-plum-soft">
            Quick wins to keep your Life Admin healthy.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {nudges.map((n) => (
          <li key={n.id}>
            <Link
              href={n.href}
              className="group flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white p-3 hover:shadow-sm hover:-translate-y-0.5 transition"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-tal-plum text-sm truncate">
                  {n.title}
                </div>
                <div className="text-xs text-tal-plum-soft mt-0.5 line-clamp-2">
                  {n.description}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-tal-plum shrink-0 group-hover:underline">
                {n.actionLabel}
                <span
                  aria-hidden
                  className="transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
