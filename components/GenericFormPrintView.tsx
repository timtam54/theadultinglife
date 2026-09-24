"use client";

import { useEffect, useRef } from "react";
import type { PageQuestionRow } from "@/lib/db/types";
import { formatQuestionValue } from "@/lib/services/format-question-value";
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

function displayValue(q: PageQuestionRow, raw: string | null | undefined): string {
  const v = (raw ?? "").toString();
  if (!v) return "";
  if (q.question_type === "date") return fmtDate(v);
  return formatQuestionValue(q, v);
}

// Single form field rendered like Donna's fillable planner template:
// centred label, value sitting on a horizontal ruled line. Multi-line
// question types (textarea, address) get extra ruled lines below.
function Field({
  label,
  value,
  extraLines = 0,
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

// Convert a page_group key like "employee_information" or "pom.personal"
// into a human heading: "Employee information", "Personal".
function formatGroupHeading(raw: string): string {
  const last = raw.includes(".") ? raw.split(".").pop()! : raw;
  const spaced = last.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
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

  // Skip fields that don't belong on a printable form (uploaded images /
  // files aren't renderable inline).
  const fillable = questions.filter(
    (q) => q.question_type !== "image" && q.question_type !== "file"
  );

  const groups: { key: string; questions: PageQuestionRow[] }[] = [];
  const seen = new Map<string, PageQuestionRow[]>();
  for (const q of fillable) {
    const k = q.page_group || "_";
    if (!seen.has(k)) {
      const list: PageQuestionRow[] = [];
      seen.set(k, list);
      groups.push({ key: k, questions: list });
    }
    seen.get(k)!.push(q);
  }

  return (
    <>
      <PrintStyles />
      <PrintBanner onPrint={() => window.print()} />
      <div className="max-w-[820px] mx-auto px-8 pt-6 pb-10 text-tal-plum-dark bg-white">
        <PrintHeader title={title} subtitle={subtitle} userName={userName} />
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
                      value={displayValue(q, answers[q.id])}
                      extraLines={extra}
                    />
                  );
                })}
              </div>
            </section>
          ))
        )}
        <PrintFooter />
      </div>
    </>
  );
}
