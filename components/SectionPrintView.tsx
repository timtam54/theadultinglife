"use client";

import { useEffect, useRef } from "react";
import type { PageQuestionRow, RecordRow, RecordField } from "@/lib/db/types";

function fmtDate(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

function renderFieldValue(f: RecordField): string {
  if (!f.value) return "";
  return f.type === "date" ? fmtDate(f.value) : f.value;
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

  return (
    <>
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .folder-block { break-inside: avoid-page; }
          .folder-block + .folder-block { break-before: page; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-tal-cream-soft border-b border-tal-line text-tal-plum text-sm">
        <span>
          A print dialog should open. Choose <strong>Save as PDF</strong>.
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="h-8 px-3 rounded-lg bg-tal-plum text-white text-xs font-medium"
        >
          Print again
        </button>
      </div>

      <div className="max-w-[720px] mx-auto p-8">
        <header className="mb-8 border-b border-black/20 pb-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-black/60">
            The Adulting Life · Life Admin
          </div>
          <h1 className="font-display text-3xl mt-1">{categoryLabel}</h1>
          <div className="text-sm text-black/70 mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {userName && <span>For: <strong>{userName}</strong></span>}
            <span>
              Printed: {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span>{folders.length} folders · {totalItems} items</span>
          </div>
        </header>

        {folders.length === 0 && (
          <p className="text-sm text-black/60">
            No folders in this section yet.
          </p>
        )}

        {folders.map((folder) => (
          <section key={folder.id} className="folder-block mb-8">
            <h2 className="font-display text-xl border-b border-black/30 pb-1 mb-3">
              {folder.name}
            </h2>
            {folder.hint && (
              <p className="text-xs italic text-black/60 mb-3">{folder.hint}</p>
            )}

            {folder.variant === "form" ? (
              <FormFolder folder={folder} />
            ) : (
              <ListFolder folder={folder} />
            )}
          </section>
        ))}
      </div>
    </>
  );
}

function FormFolder({ folder }: { folder: PrintFolder }) {
  const fillable = folder.questions.filter((q) => q.question_type !== "image");
  if (fillable.length === 0) {
    return <p className="text-xs text-black/60">No fields.</p>;
  }
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
      {fillable.map((q) => {
        const raw = folder.answers[q.id] ?? "";
        const value =
          q.question_type === "date" ? fmtDate(raw) : raw;
        return (
          <div key={q.id} className="contents">
            <dt className="text-black/60 py-1 pr-2 border-b border-black/10">
              {q.label}
            </dt>
            <dd className="py-1 border-b border-black/10 min-h-[1.5rem]">
              {value || <span className="text-black/30">—</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function ListFolder({ folder }: { folder: PrintFolder }) {
  if (folder.records.length === 0) {
    return <p className="text-xs text-black/60">No records in this folder.</p>;
  }
  return (
    <ul className="space-y-3 text-sm">
      {folder.records.map((r) => (
        <li key={r.id} className="record-card border border-black/20 rounded p-3">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <strong>{r.title || "Untitled"}</strong>
            {r.expiry_date && (
              <span className="text-xs text-black/60">
                Expires {fmtDate(r.expiry_date)}
              </span>
            )}
          </div>
          {r.fields && r.fields.length > 0 && (
            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-xs">
              {r.fields.map((f) => (
                <div key={f.key} className="contents">
                  <dt className="text-black/60">{f.label}</dt>
                  <dd>{renderFieldValue(f) || "—"}</dd>
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
  );
}
