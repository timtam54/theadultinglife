"use client";

import { useEffect, useRef } from "react";
import type { PageQuestionRow } from "@/lib/db/types";

function fmtDate(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

export function GenericFormPrintView({
  title,
  subtitle,
  userName,
  questions,
  answers,
}: {
  title: string;
  subtitle?: string;
  userName: string;
  questions: PageQuestionRow[];
  answers: Record<string, string | null>;
}) {
  const printed = useRef(false);
  useEffect(() => {
    if (printed.current) return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 200);
    return () => clearTimeout(t);
  }, []);

  const fillable = questions.filter((q) => q.question_type !== "image");

  return (
    <>
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
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
        </header>

        {fillable.length === 0 ? (
          <p className="text-tal-plum-soft">No fields to display.</p>
        ) : (
          <dl className="space-y-4">
            {fillable.map((q) => {
              const raw = answers[q.id];
              const value =
                q.question_type === "date" ? fmtDate(raw) : (raw ?? "").toString();
              return (
                <div key={q.id}>
                  <dt className="text-[10px] uppercase tracking-widest text-tal-plum-soft">
                    {q.label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-tal-plum-dark">
                    {value || "—"}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}

        <footer className="mt-8 pt-3 border-t border-tal-line text-[10px] text-tal-plum-soft text-center">
          Generated from The Adulting Life — not a legal document.
        </footer>
      </div>
    </>
  );
}
