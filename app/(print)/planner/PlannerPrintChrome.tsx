"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  PrintBanner,
  PrintFooter,
  PrintHeader,
  PrintStyles,
} from "@/components/print/PrintChrome";

// Auto-print wrapper for the Planner print routes. Uses the shared
// PrintChrome so the Planner PDF has the same plum header + footer as
// the folder and family-members PDFs.
export function PlannerPrintChrome({
  title,
  subtitle,
  userName,
  header = true,
  children,
}: {
  title: string;
  subtitle?: string;
  userName?: string;
  /** False when the content brings its own cover (the whole-Planner document). */
  header?: boolean;
  children: ReactNode;
}) {
  const printed = useRef(false);
  useEffect(() => {
    if (printed.current) return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <PrintStyles />
      <PrintBanner onPrint={() => window.print()} />

      <div className="max-w-[820px] mx-auto px-8 pt-6 pb-10 text-tal-plum-dark bg-white">
        {header && (
          <PrintHeader
            title={title}
            subtitle={subtitle}
            userName={userName}
          />
        )}
        {children}
        <PrintFooter />
      </div>
    </>
  );
}
