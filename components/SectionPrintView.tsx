"use client";

import { useEffect, useRef } from "react";
import type { PageQuestionRow, RecordRow } from "@/lib/db/types";
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

export interface PrintFolder {
  id: string;
  name: string;
  hint: string | null;
  variant: "form" | "list";
  questions: PageQuestionRow[];
  answers: Record<string, string | null>;
  records: RecordRow[];
}

export function SectionPrintView({
  categoryLabel,
  userName,
  folders,
}: {
  categoryLabel: string;
  userName: string;
  folders: PrintFolder[];
}) {
  const printed = useRef(false);
  useEffect(() => {
    if (printed.current) return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  const totalItems = folders.reduce(
    (a, f) => a + (f.variant === "form" ? f.questions.length : f.records.length),
    0
  );

  const meta = `${folders.length} ${folders.length === 1 ? "folder" : "folders"} · ${totalItems} items`;

  return (
    <>
      <PrintStyles />
      <PrintBanner onPrint={() => window.print()} />

      <div className="max-w-[820px] mx-auto px-8 pt-6 pb-10 text-tal-plum-dark bg-white">
        <PrintHeader
          title={categoryLabel}
          subtitle="The Adulting Life Organiser"
          userName={userName}
          meta={meta}
        />

        {folders.length === 0 && (
          <p className="text-tal-plum-soft text-center py-16">
            No folders in this section yet.
          </p>
        )}

        {folders.map((folder, i) => (
          <section
            key={folder.id}
            className={`print-avoid-break mb-8 ${i > 0 ? "print-page-break" : ""}`}
          >
            <h2 className="font-display text-lg text-tal-plum-dark border-b border-tal-plum-dark/30 pb-1 mb-3">
              {folder.name}…
            </h2>
            {folder.hint && (
              <p className="text-xs italic text-tal-plum-soft mb-3">
                {folder.hint}
              </p>
            )}
            {folder.variant === "form" ? (
              <FormFolder folder={folder} />
            ) : (
              <ListFolder folder={folder} />
            )}
          </section>
        ))}

        <PrintFooter />
      </div>
    </>
  );
}

function FormFolder({ folder }: { folder: PrintFolder }) {
  const fillable = folder.questions.filter(
    (q) => q.question_type !== "image" && q.question_type !== "file"
  );
  if (fillable.length === 0) {
    return (
      <p className="text-xs text-tal-plum-soft">No fields.</p>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
      {fillable.map((q) => {
        const val = displayValue(q, folder.answers[q.id]);
        const extra =
          q.question_type === "textarea"
            ? 2
            : q.question_type === "address"
              ? 1
              : 0;
        return (
          <div key={q.id} className="mb-5">
            <div className="text-center text-[12px] text-tal-plum-dark mb-1 font-medium">
              {q.label}
            </div>
            <div className="border-b border-tal-plum-dark/40 min-h-[20px] text-[12px] text-tal-plum-dark px-1 pb-0.5 whitespace-pre-wrap break-words">
              {val || " "}
            </div>
            {Array.from({ length: extra }).map((_, i) => (
              <div
                key={i}
                className="border-b border-tal-plum-dark/40 min-h-[20px] mt-1"
                aria-hidden
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ListFolder({ folder }: { folder: PrintFolder }) {
  if (folder.records.length === 0) {
    return (
      <p className="text-xs text-tal-plum-soft">No records in this folder.</p>
    );
  }
  return (
    <ul className="space-y-3 text-sm">
      {folder.records.map((r) => (
        <li
          key={r.id}
          className="print-avoid-break rounded-lg border border-tal-plum-dark/20 p-3"
        >
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <strong className="text-tal-plum-dark">
              {r.title || "Untitled"}
            </strong>
            {r.expiry_date && (
              <span className="text-[11px] text-tal-plum-soft">
                Expires {fmtDate(r.expiry_date)}
              </span>
            )}
          </div>
          {r.notes && (
            <p className="text-xs text-tal-plum-dark mt-2 whitespace-pre-line">
              {r.notes}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
