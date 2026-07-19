import Link from "next/link";
import type { SubcategoryScope } from "@/lib/db/types";

export interface FolderProgressProps {
  scope: SubcategoryScope;
  startedCount: number;
  completedCount: number;
  targetCount: number;
  instanceCount: number;
}

type Tone = "done" | "partial" | "empty" | "neutral";

function progressTotal(p: FolderProgressProps): number {
  if (
    p.scope === "family_list" ||
    p.scope === "user_list" ||
    p.scope === "per_user_list"
  ) {
    return p.instanceCount;
  }
  return p.targetCount;
}

function progressTone(p: FolderProgressProps): Tone {
  const total = progressTotal(p);
  if (total === 0) {
    // For list scopes, zero total means "no items yet".
    if (
      p.scope === "family_list" ||
      p.scope === "user_list" ||
      p.scope === "per_user_list"
    ) {
      return "empty";
    }
    return "neutral";
  }
  if (p.completedCount >= total) return "done";
  if (p.completedCount > 0 || p.startedCount > 0) return "partial";
  return "empty";
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
  thumbnailUrl,
}: {
  index: number;
  href: string;
  name: string;
  hint?: string | null;
  progress?: FolderProgressProps;
  thumbnailUrl?: string;
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
        {thumbnailUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumbnailUrl}
            alt=""
            width={40}
            height={40}
            className="shrink-0 w-10 h-10 rounded-lg object-cover ring-1 ring-tal-line bg-white"
          />
        ) : (
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
        )}
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
        {progress && <ProgressPill progress={progress} />}
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

export function FolderProgressHeader() {
  return (
    <div
      className="grid grid-cols-3 gap-0 text-[10px] uppercase tracking-wider text-tal-plum-soft"
      aria-hidden
    >
      <span className="w-14 text-center">Started</span>
      <span className="w-14 text-center">Complete</span>
      <span className="w-14 text-center">Total</span>
    </div>
  );
}

function ProgressPill({
  progress,
}: {
  progress: FolderProgressProps;
}) {
  const total = progressTotal(progress);
  const { startedCount, completedCount } = progress;

  return (
    <span
      className="grid grid-cols-3 text-sm tabular-nums text-tal-plum"
      aria-label={`${startedCount} started, ${completedCount} complete, ${total} total`}
    >
      <span className="w-14 text-center">{startedCount}</span>
      <span className="w-14 text-center">{completedCount}</span>
      <span className="w-14 text-center">{total}</span>
    </span>
  );
}
