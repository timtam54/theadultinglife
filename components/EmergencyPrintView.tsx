"use client";

import { useEffect, useRef } from "react";
import type { EmergencySection } from "@/lib/services/emergency";
import type { RecordField } from "@/lib/db/types";

function fmtDate(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

function renderField(f: RecordField): string {
  if (!f.value) return "";
  return f.type === "date" ? fmtDate(f.value) : f.value;
}

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

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .section-block { break-inside: avoid; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-tal-cream-soft border-b border-tal-line text-tal-plum text-sm">
        <span>
          A print dialog should open. Choose <strong>Save as PDF</strong>.
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-medium"
        >
          Print again
        </button>
      </div>

      <div className="max-w-[720px] mx-auto p-6">
        <header className="mb-6 border-b-2 border-red-600 pb-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-red-700 font-bold">
            In Case of Emergency
          </div>
          <h1 className="font-display text-3xl mt-1">Emergency information</h1>
          <div className="text-sm text-black/70 mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              For {userCount} family member{userCount === 1 ? "" : "s"}
            </span>
            <span>
              Printed{" "}
              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <p className="text-xs text-black/60 mt-3 italic">
            Prepared via The Adulting Life. This document contains sensitive
            personal information — store securely.
          </p>
        </header>

        {filled.length === 0 && (
          <p className="text-sm text-black/60">
            No emergency-relevant records to print.
          </p>
        )}

        {filled.map((section) => (
          <section key={section.subcategoryId} className="section-block mb-6">
            <h2 className="font-display text-xl border-b border-black/30 pb-1 mb-3">
              {section.label}
            </h2>
            <ul className="space-y-3 text-sm">
              {section.records.map((r) => (
                <li key={r.id} className="border border-black/20 rounded p-3">
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <strong>{r.title || "Untitled"}</strong>
                    <span className="text-xs text-black/60">
                      {r.userName}
                      {r.expiryDate && ` · Expires ${fmtDate(r.expiryDate)}`}
                    </span>
                  </div>
                  {r.fields && r.fields.length > 0 && (
                    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-xs">
                      {r.fields
                        .filter((f) => f.value)
                        .map((f) => (
                          <div key={f.key} className="contents">
                            <dt className="text-black/60">{f.label}</dt>
                            <dd>{renderField(f)}</dd>
                          </div>
                        ))}
                    </dl>
                  )}
                  {r.notes && (
                    <p className="text-xs text-black/70 mt-2 whitespace-pre-line">
                      {r.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
