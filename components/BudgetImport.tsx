"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AiConsentGate } from "@/components/AiConsentGate";
import { useAiConsent } from "@/hooks/useAiConsent";
import type { BudgetImportResult } from "@/lib/services/budget-import";
import { BUCKETS, BUCKET_INFO, PERIOD_LABELS, type BudgetPeriod, type BudgetSection } from "@/lib/budget";

/*
 * "Import a budget" for the Money & Me budget: upload an Excel, CSV, PDF or
 * photo of an existing budget, AI sorts it into the budget's sections (in
 * the budget's period), and the person reviews it before choosing to start
 * a new budget from it or add the lines to the budget on screen. The file
 * itself is kept in the folder's Documents.
 */

const SUBCATEGORY_ID = "admin.budgets";
const ACCEPT =
  ".xlsx,.xlsm,.csv,.txt,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif";

type ImportLine = BudgetImportResult["income"][number] & { section: BudgetSection };

const SECTION_TITLES: Record<BudgetSection, string> = {
  income: "Money coming in",
  needs: BUCKET_INFO.needs.title,
  emergencies: BUCKET_INFO.emergencies.title,
  wants: BUCKET_INFO.wants.title,
  goals: BUCKET_INFO.goals.title,
};

export function BudgetImportButton({
  userId,
  period,
  currentBudget,
  titles,
  onImported,
  className = "",
}: {
  userId: string;
  /** Amounts are converted to this period (the budget on screen's, else monthly). */
  period: BudgetPeriod;
  /** The budget on screen, to offer "add to this budget". */
  currentBudget: { id: string; name: string } | null;
  /** Section headings as the person has named them. */
  titles?: Partial<Record<BudgetSection, string>>;
  /** Called after saving; newBudgetId is set when a new budget was created. */
  onImported: (message: string, newBudgetId: string | null) => void;
  className?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const consent = useAiConsent();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ result: BudgetImportResult; filename: string } | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!(await consent.requestConsent("scan-document"))) return;
    setBusy("Uploading…");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("subcategoryId", SUBCATEGORY_ID);
      form.append("targetUserId", userId);
      form.append("allowDuplicate", "1");
      const up = await fetch("/api/files", { method: "POST", body: form });
      if (!up.ok) throw new Error("Couldn’t upload the file — try again.");
      const { file: saved } = (await up.json()) as { file: { id: string } };
      router.refresh(); // the file now shows in Documents, whatever happens next
      setBusy("Reading your budget…");
      const res = await fetch("/api/budget/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: saved.id, period }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        result?: BudgetImportResult;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.result) {
        throw new Error(
          data.message ??
            (data.error === "unsupported_file"
              ? "That file type can’t be read — use Excel (.xlsx), CSV, PDF or a photo."
              : "Couldn’t read that budget. The file has been saved to Documents below.")
        );
      }
      const r = data.result;
      if (![r.income, r.needs, r.emergencies, r.wants, r.goals].some((x) => x.length)) {
        throw new Error("No budget lines could be read from that file. It has been saved to Documents below.");
      }
      setReview({ result: r, filename: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void handleFile(f);
        }}
      />
      <button
        type="button"
        disabled={busy != null}
        onClick={() => inputRef.current?.click()}
        title="Upload an Excel, CSV, PDF or photo of your current budget and AI will fill in the budget for you to check"
        className={
          "inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-tal-line bg-white text-sm font-medium text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60 " +
          className
        }
      >
        <span aria-hidden>✨</span>
        {busy ?? "Import from Excel or a file"}
      </button>
      {error && (
        <span role="alert" className="basis-full text-xs text-red-700">
          {error}
        </span>
      )}
      {review && (
        <ImportReview
          result={review.result}
          filename={review.filename}
          period={period}
          userId={userId}
          currentBudget={currentBudget}
          titles={titles}
          onClose={() => setReview(null)}
          onImported={(msg, id) => {
            setReview(null);
            onImported(msg, id);
          }}
        />
      )}
      {consent.pendingKind && (
        <AiConsentGate kind={consent.pendingKind} onGranted={consent.onGranted} onCancel={consent.onCancel} />
      )}
    </>
  );
}

function ImportReview({
  result,
  filename,
  period,
  userId,
  currentBudget,
  titles,
  onClose,
  onImported,
}: {
  result: BudgetImportResult;
  filename: string;
  period: BudgetPeriod;
  userId: string;
  currentBudget: { id: string; name: string } | null;
  titles?: Partial<Record<BudgetSection, string>>;
  onClose: () => void;
  onImported: (message: string, newBudgetId: string | null) => void;
}) {
  const [lines, setLines] = useState<ImportLine[]>(() =>
    (["income", ...BUCKETS] as BudgetSection[]).flatMap((s) =>
      result[s].map((l) => ({ ...l, section: s }))
    )
  );
  const [target, setTarget] = useState<"new" | "current">("new");
  const [name, setName] = useState(() => filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Imported budget");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleFor = (s: BudgetSection) => (s !== "income" && titles?.[s]) || SECTION_TITLES[s];

  function edit(i: number, patch: Partial<ImportLine>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  async function apply() {
    setSaving(true);
    setError(null);
    const payload = lines
      .filter((l) => l.label.trim())
      .map((l) => ({
        section: l.section,
        label: l.label.trim(),
        amount: l.amount,
        notes: l.notes,
        // Bills keep their due date and how often they repeat.
        due_date: l.section === "needs" || l.section === "wants" ? l.dueDate : null,
        repeats: l.section === "needs" || l.section === "wants" ? l.repeats : null,
      }));
    try {
      if (target === "new" || !currentBudget) {
        const res = await fetch("/api/budget", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, name: name.trim() || "Imported budget", period, lines: payload }),
        });
        if (!res.ok) throw new Error();
        const { budget } = (await res.json()) as { budget: { id: string } };
        onImported(`Created “${name.trim() || "Imported budget"}” with ${payload.length} lines from your file.`, budget.id);
      } else {
        const res = await fetch(`/api/budget/${currentBudget.id}/lines`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines: payload }),
        });
        if (!res.ok) throw new Error();
        onImported(`Added ${payload.length} lines from your file to “${currentBudget.name}”.`, null);
      }
    } catch {
      setError("Couldn’t save the budget — check your connection and try again.");
      setSaving(false);
    }
  }

  const per = PERIOD_LABELS[period].toLowerCase();
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-import-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 text-left"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-tal-line">
          <h3 id="budget-import-title" className="font-display text-lg text-tal-plum">
            Check your imported budget
          </h3>
          <p className="text-xs text-tal-plum-soft mt-1">
            AI has read {lines.length} lines from “{filename}” and sorted them into your budget. Amounts
            are {per}. Fix anything it got wrong, then choose where to put it. The file is saved in
            Documents.
          </p>
        </div>
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <fieldset className="space-y-2">
            <legend className="text-sm text-tal-plum mb-1">Put these lines into</legend>
            <label className="flex items-center gap-2 text-sm text-tal-plum">
              <input type="radio" checked={target === "new"} onChange={() => setTarget("new")} />
              A new budget called
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="h-9 w-56 rounded-lg border border-tal-line px-2 text-sm text-tal-plum"
                aria-label="New budget name"
              />
            </label>
            {currentBudget && (
              <label className="flex items-center gap-2 text-sm text-tal-plum">
                <input type="radio" checked={target === "current"} onChange={() => setTarget("current")} />
                Add them to “{currentBudget.name}”
              </label>
            )}
          </fieldset>
          {result.warnings.length > 0 && (
            <ul className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 list-disc pl-8 space-y-0.5">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          {(["income", ...BUCKETS] as BudgetSection[]).map((s) => {
            const rows = lines.map((l, i) => ({ l, i })).filter((x) => x.l.section === s);
            if (rows.length === 0) return null;
            return (
              <section key={s} className="rounded-xl border border-tal-line overflow-hidden">
                <h4 className="px-3 py-2 bg-black text-white text-xs font-semibold uppercase tracking-wide">
                  {titleFor(s)}
                </h4>
                <ul className="divide-y divide-tal-line">
                  {rows.map(({ l, i }) => (
                    <li key={i} className="px-3 py-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_10rem_9rem_2rem] items-center">
                      <input
                        value={l.label}
                        onChange={(e) => edit(i, { label: e.target.value })}
                        aria-label="Line"
                        className="h-9 rounded-lg border border-tal-line px-2 text-sm text-tal-plum"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={l.amount ?? ""}
                        onChange={(e) => edit(i, { amount: e.target.value === "" ? null : Number(e.target.value) })}
                        aria-label={`Amount (${per})`}
                        className="h-9 rounded-lg border border-tal-line px-2 text-sm text-tal-plum"
                      />
                      <select
                        value={l.section}
                        onChange={(e) => edit(i, { section: e.target.value as BudgetSection })}
                        aria-label="Section"
                        className="h-9 rounded-lg border border-tal-line px-2 text-sm text-tal-plum"
                      >
                        {(["income", ...BUCKETS] as BudgetSection[]).map((o) => (
                          <option key={o} value={o}>
                            {titleFor(o)}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-tal-plum-soft">
                        {l.dueDate && (l.section === "needs" || l.section === "wants")
                          ? `Due ${l.dueDate.split("-").reverse().join("/")}${l.repeats ? ` · ${l.repeats}` : ""}`
                          : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                        aria-label={`Remove ${l.label}`}
                        className="h-8 w-8 rounded-lg text-tal-plum-soft hover:bg-red-50 hover:text-red-700"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
        <div className="px-5 py-3 border-t border-tal-line flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={saving || lines.length === 0}
            className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Saving…" : target === "new" || !currentBudget ? "Create budget" : "Add to budget"}
          </button>
        </div>
      </div>
    </div>
  );
}
