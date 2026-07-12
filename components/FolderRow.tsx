import Link from "next/link";
import type { SubcategoryScope } from "@/lib/db/types";

export interface FolderProgressProps {
  scope: SubcategoryScope;
  completedCount: number;
  targetCount: number;
  instanceCount: number;
}

type Tone = "done" | "partial" | "empty" | "neutral";

function progressTone(p: FolderProgressProps): Tone {
  const { scope, completedCount, targetCount, instanceCount } = p;
  if (
    scope === "family_list" ||
    scope === "user_list" ||
    scope === "per_user_list"
  ) {
    return instanceCount > 0 ? "done" : "empty";
  }
  if (scope === "family_singleton") {
    if (targetCount === 0) return "neutral";
    return completedCount >= targetCount ? "done" : "empty";
  }
  // per_user
  if (targetCount === 0) return "neutral";
  if (completedCount >= targetCount) return "done";
  return completedCount > 0 ? "partial" : "empty";
}

function rowBg(tone: Tone): string {
  if (tone === "done") return "bg-green-50 hover:bg-green-100";
  if (tone === "partial") return "bg-amber-50 hover:bg-amber-100";
  if (tone === "empty") return "bg-red-50 hover:bg-red-100";
  return "hover:bg-tal-cream-soft";
}

export function FolderRow({
  index,
  href,
  name,
  hint,
  progress,
}: {
  index: number;
  href: string;
  name: string;
  hint?: string | null;
  progress?: FolderProgressProps;
}) {
  const tone: Tone = progress ? progressTone(progress) : "neutral";
  return (
    <li>
      <Link
        href={href}
        className={
          "flex items-center gap-3 px-4 py-3 transition " + rowBg(tone)
        }
      >
        <span className="w-6 text-right text-sm text-tal-plum-soft tabular-nums">
          {index}.
        </span>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="shrink-0"
        >
          <path
            d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2a1.5 1.5 0 0 1 1.05.43l1.32 1.29c.28.27.66.43 1.05.43H19.5A1.5 1.5 0 0 1 21 8.65v9.35a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6.5Z"
            fill="#e6c48a"
            stroke="#b08a4e"
            strokeWidth="1"
          />
        </svg>
        {progress && <ScopeGlyph scope={progress.scope} />}
        <span className="flex-1 min-w-0">
          <span className="block text-sm text-tal-plum truncate">{name}</span>
          {hint && (
            <span className="block text-xs italic text-tal-plum-soft truncate">
              {hint}
            </span>
          )}
        </span>
        {tone === "done" && <TickIcon />}
        {tone === "done" && <span className="sr-only">Complete.</span>}
        {progress && <ProgressPill progress={progress} tone={tone} />}
        <span className="text-tal-plum-soft" aria-hidden>
          ›
        </span>
      </Link>
    </li>
  );
}

function TickIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-green-700"
    >
      <path
        d="M5 12l5 5L20 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ScopeGlyph({ scope }: { scope: SubcategoryScope }) {
  const common = "shrink-0 text-tal-plum-soft";
  if (scope === "per_user") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label="One per person" className={common}>
        <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 20c1.5-3.5 4.5-5 7-5s5.5 1.5 7 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (scope === "user_list") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label="Family members" className={common}>
        <circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 19c1-3 3.5-4.5 5-4.5S12 16 13 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11 19c1-3 3.5-4.5 5-4.5S20 16 21 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (scope === "family_singleton") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label="One per family" className={common}>
        <rect x="4" y="10" width="16" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 10l8-6 8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (scope === "per_user_list") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label="Personal list" className={common}>
        <circle cx="12" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 20c1-3 3.5-4.5 6-4.5s5 1.5 6 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4 12h6M14 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  // family_list
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label="Many per family" className={common}>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ProgressPill({
  progress,
  tone,
}: {
  progress: FolderProgressProps;
  tone: Tone;
}) {
  const { scope, completedCount, targetCount, instanceCount } = progress;

  let label: string;
  if (scope === "family_list" || scope === "per_user_list") {
    label = `${instanceCount} item${instanceCount === 1 ? "" : "s"}`;
  } else if (scope === "user_list") {
    label = `${instanceCount} ${instanceCount === 1 ? "person" : "people"}`;
  } else if (scope === "family_singleton") {
    if (targetCount === 0) return null;
    label = `${completedCount}/${targetCount}`;
  } else {
    if (targetCount === 0) return null;
    label = `${completedCount}/${targetCount}`;
  }

  const cls =
    tone === "done"
      ? "bg-green-100 text-green-800 border-green-200"
      : tone === "partial"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : tone === "empty"
      ? "bg-red-100 text-red-800 border-red-200"
      : "bg-tal-cream-soft text-tal-plum-soft border-tal-line";

  const toneWord =
    tone === "done" ? "complete" :
    tone === "partial" ? "in progress" :
    tone === "empty" ? "not started" : "";

  return (
    <span
      className={
        "text-xs tabular-nums px-2 py-0.5 rounded-full border " + cls
      }
      aria-label={toneWord ? `${label}, ${toneWord}` : label}
    >
      {label}
    </span>
  );
}
