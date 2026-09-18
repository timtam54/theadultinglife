"use client";

interface Props {
  slug: string;
  className?: string;
}

// Opens the per-section print view in a new tab. That page auto-triggers
// window.print() so the user is straight into the "Save as PDF" / paper
// dialog. Kept simple: no server-side PDF generation.
export function PrintSectionButton({ slug, className }: Props) {
  const href = `/planner-section/${encodeURIComponent(slug)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="Print or save as PDF"
      aria-label="Print or save as PDF"
      className={
        className ??
        "h-9 px-3 rounded-xl border border-tal-line text-tal-plum text-sm hover:bg-tal-cream-soft inline-flex items-center gap-1.5"
      }
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden sm:inline">Print / PDF</span>
    </a>
  );
}
