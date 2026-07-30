"use client";

import { useEffect } from "react";

// Auto-triggers window.print() on mount, and shows a manual "Print" button
// for cases where the print dialog was cancelled or blocked. Hidden when the
// page itself is being printed (print:hidden on the parent).
export function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-9 px-3 rounded-lg bg-black text-white text-sm font-medium"
    >
      Print
    </button>
  );
}
