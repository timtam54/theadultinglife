"use client";

/** Print / Save as PDF for the shared Planner link (no account needed). */
export function PrintThisButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-9 px-3 rounded-xl bg-black text-white text-sm font-medium"
    >
      Print / Save PDF
    </button>
  );
}
