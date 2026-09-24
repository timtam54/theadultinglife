"use client";

import { useEffect, useRef } from "react";
import type { RecordRow } from "@/lib/db/types";
import {
  PrintBanner,
  PrintFooter,
  PrintHeader,
  PrintStyles,
} from "@/components/print/PrintChrome";

function fmtDate(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function GenericListPrintView({
  title,
  subtitle,
  userName,
  records,
}: {
  title: string;
  subtitle?: string;
  userName: string;
  records: RecordRow[];
}) {
  const printed = useRef(false);
  useEffect(() => {
    if (printed.current) return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 200);
    return () => clearTimeout(t);
  }, []);

  const meta = `${records.length} ${records.length === 1 ? "item" : "items"}`;

  return (
    <>
      <PrintStyles />
      <PrintBanner onPrint={() => window.print()} />

      <div className="max-w-[820px] mx-auto px-8 pt-6 pb-10 text-tal-plum-dark bg-white">
        <PrintHeader
          title={title}
          subtitle={subtitle}
          userName={userName}
          meta={meta}
        />

        {records.length === 0 ? (
          <p className="text-tal-plum-soft text-center py-16">
            No records in this folder yet.
          </p>
        ) : (
          <div className="space-y-4">
            {records.map((r) => (
              <div
                key={r.id}
                className="print-avoid-break rounded-lg border border-tal-plum-dark/20 p-4"
              >
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <h2 className="font-display text-base text-tal-plum-dark">
                    {r.title || "Untitled"}
                  </h2>
                  {r.expiry_date && (
                    <div className="text-[11px] text-tal-plum-soft">
                      Expires {fmtDate(r.expiry_date)}
                    </div>
                  )}
                </div>
                {r.notes && (
                  <div className="mt-2 pt-2 border-t border-tal-plum-dark/10">
                    <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft mb-1">
                      Notes
                    </div>
                    <div className="text-sm whitespace-pre-wrap text-tal-plum-dark">
                      {r.notes}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <PrintFooter />
      </div>
    </>
  );
}
