"use client";

import { useEffect, useRef } from "react";
import type { EmergencySection } from "@/lib/services/emergency";
import {
  PrintBanner,
  PrintFooter,
  PrintHeader,
  PrintStyles,
} from "@/components/print/PrintChrome";

export function EmergencyPrintView({
  sections,
  userCount,
}: {
  sections: EmergencySection[];
  userCount: number;
}) {
  const printed = useRef(false);
  useEffect(() => {
    if (printed.current) return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);

  const filled = sections.filter((s) => s.records.length > 0);
  const meta = `For ${userCount} family member${userCount === 1 ? "" : "s"}`;

  return (
    <>
      <PrintStyles />
      <PrintBanner tone="red" onPrint={() => window.print()} />

      <div className="max-w-[820px] mx-auto px-8 pt-6 pb-10 text-tal-plum-dark bg-white">
        <PrintHeader
          tone="red"
          title="Emergency information"
          subtitle="In Case of Emergency"
          meta={meta}
        />
        <p className="text-xs text-tal-plum-soft italic mb-6">
          Prepared via The Adulting Life. This document contains sensitive
          personal information — store securely.
        </p>

        {filled.length === 0 && (
          <p className="text-tal-plum-soft text-center py-16">
            No emergency-relevant records to print.
          </p>
        )}

        {filled.map((section) => (
          <section
            key={section.subcategoryId}
            className="print-avoid-break mb-6"
          >
            <h2 className="font-display text-lg text-tal-plum-dark border-b border-tal-plum-dark/30 pb-1 mb-3">
              {section.label}…
            </h2>
            <ul className="space-y-3 text-sm">
              {section.records.map((r) => (
                <li
                  key={r.id}
                  className="print-avoid-break rounded-lg border border-tal-plum-dark/20 p-3"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <strong className="text-tal-plum-dark">
                      {r.title || "Untitled"}
                    </strong>
                    <span className="text-[11px] text-tal-plum-soft">
                      {r.userName}
                    </span>
                  </div>
                  {r.fields.length > 0 && (
                    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-xs">
                      {r.fields.map((f, i) => (
                        <div key={i} className="contents">
                          <dt className="text-tal-plum-soft">{f.label}</dt>
                          <dd className="text-tal-plum-dark">{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <PrintFooter />
      </div>
    </>
  );
}
