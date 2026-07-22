"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORY_IDS } from "@/lib/db/types";
import { BADGES } from "@/lib/services/learnEngagement";

type Badge = (typeof BADGES)[number];

export type EarnedBadge = {
  id: string;
  badge: Badge;
  awardedAt: string;
};

const PREVIEW_COUNT = 2;

export function StreakCard({
  currentStreak,
  longestStreak,
}: {
  currentStreak: number;
  longestStreak: number;
}) {
  return (
    <div
      id="streak-card"
      className="rounded-2xl bg-amber-100 ring-1 ring-amber-200 p-5 scroll-mt-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-amber-900 mb-1 font-medium">
            Learning streak
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-display text-4xl text-amber-900 leading-none tabular-nums">
              {currentStreak}
            </span>
            <span className="text-sm text-amber-900/80">
              day{currentStreak === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="text-3xl" aria-hidden>
          🔥
        </div>
      </div>
      <div className="text-xs text-amber-900/80 mt-1">
        {currentStreak === 0
          ? "Read a lesson today to start"
          : `Longest: ${longestStreak} day${longestStreak === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}

export function RecentBadgesCard({ earned }: { earned: EarnedBadge[] }) {
  const [expanded, setExpanded] = useState(false);

  const earnedIds = new Set(earned.map((e) => e.id));
  const locked = BADGES.filter((b) => !earnedIds.has(b.id));
  const preview = earned.slice(0, PREVIEW_COUNT);
  const total = earned.length + locked.length;
  const hasMore = total > preview.length;
  const restEarned = earned.slice(PREVIEW_COUNT);

  return (
    <section className="rounded-2xl border border-tal-line bg-white p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-display text-lg text-tal-plum">Recently earned</h2>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-tal-plum-soft hover:text-tal-plum hover:underline"
          >
            {expanded ? "Show less" : `View all ${total}`}
          </button>
        )}
      </div>

      {earned.length === 0 ? (
        <p className="text-sm text-tal-plum-soft">
          Read your first article to earn a badge.
        </p>
      ) : (
        <div className="space-y-1.5">
          {preview.map((b) => (
            <BadgeRow key={b.id} badge={b.badge} earned />
          ))}
          {expanded && (
            <>
              {restEarned.map((b) => (
                <BadgeRow key={b.id} badge={b.badge} earned />
              ))}
              {locked.map((b) => (
                <BadgeRow key={b.id} badge={b} earned={false} />
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function BadgeRow({ badge, earned }: { badge: Badge; earned: boolean }) {
  const href = earned ? badgeHref(badge) : null;
  const inner = (
    <>
      <span className="text-sm" aria-hidden>
        {badgeEmoji(badge.icon)}
      </span>
      <span
        className={
          "text-xs font-medium truncate " +
          (earned ? "text-tal-plum" : "text-tal-plum-soft/60")
        }
      >
        {badge.label}
      </span>
    </>
  );
  const classes =
    "flex items-center gap-2 rounded-lg px-2.5 py-1.5 " +
    (earned ? "bg-tal-cream-soft" : "bg-tal-cream-soft/40");
  if (href) {
    return (
      <Link
        href={href}
        className={classes + " hover:bg-tal-cream transition"}
        title={badge.description}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className={classes} title={badge.description}>
      {inner}
    </div>
  );
}

function badgeHref(badge: Badge): string | null {
  if (badge.id.startsWith("cat-")) {
    const cat = badge.id.slice("cat-".length);
    if ((CATEGORY_IDS as readonly string[]).includes(cat)) {
      return `/learn/certificate/${cat}`;
    }
  }
  switch (badge.id) {
    case "first-lesson":
    case "getting-started":
    case "on-a-roll":
    case "halfway":
    case "graduated":
      return "/learn/articles?filter=read";
    case "quiz-taker":
      return "/learn/quizzes?filter=all";
    case "quiz-ace":
    case "quiz-master":
      return "/learn/quizzes?filter=passed";
    case "streak-3":
    case "streak-7":
    case "streak-14":
    case "streak-30":
      return "/learn#streak-card";
    default:
      return null;
  }
}

function badgeEmoji(icon: Badge["icon"]): string {
  switch (icon) {
    case "sparkle":
      return "✨";
    case "star":
      return "⭐";
    case "flame":
      return "🔥";
    case "trophy":
      return "🏆";
    case "target":
      return "🎯";
    case "check":
      return "✅";
    case "book":
      return "📚";
    case "medal":
      return "🥇";
    case "rocket":
      return "🚀";
  }
}
