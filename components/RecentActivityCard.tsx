"use client";

import Link from "next/link";
import { useState } from "react";
import type { ActivityEvent } from "@/lib/services/activity";

const PREVIEW_COUNT = 4;

export function RecentActivityCard({ items }: { items: ActivityEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;

  const hasMore = items.length > PREVIEW_COUNT;
  const visible = expanded ? items : items.slice(0, PREVIEW_COUNT);

  return (
    <section className="rounded-2xl border border-tal-line bg-white p-6">
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-display text-xl text-tal-plum">Recent activity</h2>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-sm text-tal-plum-soft hover:text-tal-plum hover:underline"
          >
            {expanded ? "Show less" : `View all ${items.length} →`}
          </button>
        )}
      </div>
      <ul className="space-y-3">
        {visible.map((ev) => (
          <li key={ev.id}>
            <Link
              href={ev.href}
              className="flex items-center gap-3 hover:bg-tal-cream-soft rounded-xl -mx-2 px-2 py-2 transition-colors"
            >
              <span
                className={
                  "inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0 " +
                  activityTone(ev.kind)
                }
                aria-hidden
              >
                <ActivityIcon kind={ev.kind} />
              </span>
              <span className="flex-1 min-w-0 text-sm text-tal-plum truncate">
                {ev.title}
              </span>
              <span className="text-xs text-tal-plum-soft shrink-0 tabular-nums">
                {formatActivityTime(ev.occurredAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function activityTone(kind: ActivityEvent["kind"]): string {
  switch (kind) {
    case "file_uploaded":
      return "bg-violet-100 text-violet-700";
    case "record_added":
    case "record_updated":
      return "bg-sky-100 text-sky-700";
    case "answer_updated":
      return "bg-amber-100 text-amber-800";
    case "lesson_completed":
    case "quiz_completed":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-tal-cream-soft text-tal-plum";
  }
}

function ActivityIcon({ kind }: { kind: ActivityEvent["kind"] }) {
  if (kind === "file_uploaded") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (kind === "answer_updated") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4V4Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M9 13l2 2 5-5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "lesson_completed" || kind === "quiz_completed") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="m8 12 3 3 5-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (kind === "lesson_started") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M8 5v14l11-7z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2c.4 0 .78.16 1.06.44l1.3 1.31c.28.28.66.44 1.06.44H19.5A1.5 1.5 0 0 1 21 8.69v9.31A1.5 1.5 0 0 1 19.5 19.5h-15A1.5 1.5 0 0 1 3 18V6.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatActivityTime(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const time = then.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (then >= startOfToday) return `Today, ${time}`;
  if (then >= startOfYesterday) return `Yesterday, ${time}`;
  if (diffHr < 24 * 7) {
    const days = Math.floor(diffHr / 24);
    return `${days}d ago`;
  }
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
