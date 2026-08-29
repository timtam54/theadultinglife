"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-9 px-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/85 inline-flex items-center gap-1.5"
    >
      Print or Save as PDF
    </button>
  );
}
