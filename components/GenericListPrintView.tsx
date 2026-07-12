"use client";

import { useEffect, useRef } from "react";
import type { RecordField, RecordRow } from "@/lib/db/types";

function fmtDate(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

function renderValue(f: RecordField): string {
  if (!f.value) return "";
  return f.type === "date" ? fmtDate(f.value) : f.value;
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

  return (
    <>
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .record-card { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-tal-cream-soft border-b border-tal-line text-tal-plum text-sm">
        <span>
          A print dialog should open. Choose <strong>Save as PDF</strong>.
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="h-9 px-3 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-6 sm:p-8 text-tal-plum-dark">
        <header className="mb-6 border-b border-tal-line pb-4">
          <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft">
            The Adulting Life
          </div>
          <h1 className="font-display text-3xl text-tal-plum mt-0.5">{title}</h1>
          {subtitle && (
            <div className="text-sm text-tal-plum-soft mt-1">{subtitle}</div>
          )}
          {userName && (
            <div className="text-sm text-tal-plum mt-2">
              <span className="text-tal-plum-soft">For: </span>
              {userName}
            </div>
          )}
          <div className="text-xs text-tal-plum-soft mt-2">
            {records.length} {records.length === 1 ? "item" : "items"}
          </div>
        </header>

        {records.length === 0 ? (
          <p className="text-tal-plum-soft">No records in this folder yet.</p>
        ) : (
          <div className="space-y-5">
            {records.map((r) => (
              <div
                key={r.id}
                className="record-card rounded-xl border border-tal-line p-4"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="font-display text-lg text-tal-plum">
                    {r.title || "Untitled"}
                  </h2>
                  {r.expiry_date && (
                    <div className="text-xs text-tal-plum-soft">
                      Expires {fmtDate(r.expiry_date)}
                    </div>
                  )}
                </div>
                {r.fields.length > 0 && (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {r.fields.map((f) => (
                      <div key={f.key}>
                        <dt className="text-[10px] uppercase tracking-widest text-tal-plum-soft">
                          {f.label}
                        </dt>
                        <dd className="text-sm text-tal-plum-dark break-words">
                          {renderValue(f) || "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {r.notes && (
                  <div className="mt-3 pt-3 border-t border-tal-line">
                    <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft mb-1">
                      Notes
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{r.notes}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <footer className="mt-8 pt-3 border-t border-tal-line text-[10px] text-tal-plum-soft text-center">
          Generated from The Adulting Life — not a legal document.
        </footer>
      </div>
    </>
  );
}
