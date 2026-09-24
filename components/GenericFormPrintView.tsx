"use client";

import { useEffect, useRef } from "react";
import type { PageQuestionRow } from "@/lib/db/types";
import { formatQuestionValue } from "@/lib/services/format-question-value";

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

function displayValue(q: PageQuestionRow, raw: string | null | undefined): string {
  const v = (raw ?? "").toString();
  if (!v) return "";
  if (q.question_type === "date") return fmtDate(v);
  return formatQuestionValue(q, v);
}

// One "field" on the page. Modelled on Donna's fillable planner
// template: centred label, value sitting ON a horizontal ruled line.
// Long values wrap onto extra ruled lines below.
function Field({
  label,
  value,
  extraLines = 1,
}: {
  label: string;
  value: string;
  extraLines?: number;
}) {
  return (
    <div className="mb-6">
      <div className="text-center text-[13px] text-tal-plum-dark mb-1.5 font-medium">
        {label}
      </div>
      <div className="border-b border-tal-plum-dark/40 min-h-[22px] text-[13px] text-tal-plum-dark px-1 pb-0.5 whitespace-pre-wrap break-words">
        {value || " "}
      </div>
      {Array.from({ length: extraLines }).map((_, i) => (
        <div
          key={i}
          className="border-b border-tal-plum-dark/40 min-h-[22px] mt-1"
          aria-hidden
        />
      ))}
    </div>
  );
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
    const t = setTimeout(() => window.print(), 250);
    return () => clearTimeout(t);
  }, []);

  // Skip fields that don't belong on a printable form (uploaded images,
  // internal end-date "archive" markers).
  const fillable = questions.filter(
    (q) => q.question_type !== "image" && q.question_type !== "file"
  );

  // Group by page_group so section headings appear on the printed form
  // the same way they would on screen.
  const groups: { key: string; questions: PageQuestionRow[] }[] = [];
  const seenGroups = new Map<string, PageQuestionRow[]>();
  for (const q of fillable) {
    const k = q.page_group || "_";
    if (!seenGroups.has(k)) {
      const list: PageQuestionRow[] = [];
      seenGroups.set(k, list);
      groups.push({ key: k, questions: list });
    }
    seenGroups.get(k)!.push(q);
  }

  const generatedOn = new Date().toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        @page { size: A4; margin: 16mm 14mm 20mm 14mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: auto; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-tal-cream-soft border-b border-tal-line text-tal-plum text-sm">
        <span>
          A print dialog should open. Choose <strong>Save as PDF</strong>.
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="h-9 px-3 rounded-xl bg-black text-white text-sm font-medium"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="max-w-[820px] mx-auto px-8 pt-6 pb-10 text-tal-plum-dark bg-white">
        {/* Slim plum header bar — title left, recipient right. */}
        <div className="bg-tal-plum text-white rounded-lg px-5 py-3 flex items-baseline justify-between gap-4 mb-6 print:rounded-none">
          <div className="min-w-0">
            <div className="font-display text-xl leading-tight truncate">
              {title}
            </div>
            {subtitle && (
              <div className="text-white/75 text-xs mt-0.5 truncate">
                {subtitle}
              </div>
            )}
          </div>
          {userName && (
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase tracking-widest text-white/60">
                For
              </div>
              <div className="text-sm">{userName}</div>
            </div>
          )}
        </div>

        {fillable.length === 0 ? (
          <p className="text-tal-plum-soft text-center py-16">
            No fields to display.
          </p>
        ) : (
          groups.map((g, gi) => (
            <section key={g.key} className={gi === 0 ? "" : "mt-8"}>
              {groups.length > 1 && g.key !== "_" && (
                <h2 className="font-display text-lg text-tal-plum-dark mb-3">
                  {formatGroupHeading(g.key)}…
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                {g.questions.map((q) => {
                  const val = displayValue(q, answers[q.id]);
                  const extra =
                    q.question_type === "textarea"
                      ? 2
                      : q.question_type === "address"
                        ? 1
                        : 0;
                  return (
                    <Field
                      key={q.id}
                      label={q.label}
                      value={val}
                      extraLines={extra}
                    />
                  );
                })}
              </div>
            </section>
          ))
        )}

        <footer className="mt-10 pt-3 border-t border-tal-plum-dark/20 text-[10px] text-tal-plum-soft flex items-center justify-between">
          <span>Generated from The Adulting Life · {generatedOn}</span>
          <span>Confidential · shared with recipient's permission</span>
        </footer>
      </div>
    </>
  );
}

// Convert a page_group key like "employee_information" or "pom.personal"
// into a human heading: "Employee information", "Personal".
function formatGroupHeading(raw: string): string {
  const last = raw.includes(".") ? raw.split(".").pop()! : raw;
  const spaced = last.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
