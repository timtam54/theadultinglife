"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import type { BudgetLineRow, BudgetWithLines } from "@/lib/db/budgets";
import { BudgetChartsButton } from "@/components/BudgetCharts";
import { BudgetImportButton } from "@/components/BudgetImport";
import {
  BUCKETS,
  BUCKET_INFO,
  bucketTitle,
  DEFAULT_REPEATS,
  PERIODS,
  PERIOD_LABELS,
  REMIND_OPTIONS,
  REPEATS,
  REPEAT_LABELS,
  localToday,
  nextDueDate,
  summariseBudget,
  type Bucket,
  type BudgetSection,
  type Repeats,
} from "@/lib/budget";
import { PdfActions } from "@/components/PdfActions";

/*
 * "Money & Me" budget for admin.budgets, following Donna's simple budget
 * template: choose a period, add income, then give every dollar a job across
 * Needs / Emergencies / Wants / Goals savings. Lines can be renamed, removed
 * and added; totals always include every line. Needs and Wants lines can be
 * bills with a due date and a reminder that feeds Reminders and the
 * dashboard. Every field saves when you leave it.
 */

type LinePatch = Partial<
  Pick<BudgetLineRow, "label" | "amount" | "notes" | "due_date" | "repeats" | "remind_days_before">
>;
type BudgetPatch = Partial<
  Pick<
    BudgetWithLines,
    | "name"
    | "title_needs"
    | "title_emergencies"
    | "title_wants"
    | "title_goals"
    | "period"
    | "start_date"
    | "pct_needs"
    | "pct_emergencies"
    | "pct_wants"
    | "pct_goals"
  >
>;

const money = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });

export function BudgetPlanner({ userId }: { userId: string }) {
  const [budgets, setBudgets] = useState<BudgetWithLines[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/budget?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("load_failed");
        const data = (await res.json()) as { budgets: BudgetWithLines[] };
        if (cancelled) return;
        setBudgets(data.budgets);
        setFailed(false);
        setLoaded(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  // The budget on screen: the one picked, else the newest current one, else
  // the newest archived one.
  const current = budgets.filter((b) => !b.archived_at);
  const archived = budgets.filter((b) => b.archived_at);
  const budget =
    budgets.find((b) => b.id === selectedId) ??
    current[current.length - 1] ??
    archived[archived.length - 1] ??
    null;

  function update(id: string, fn: (b: BudgetWithLines) => BudgetWithLines) {
    setBudgets((bs) => bs.map((b) => (b.id === id ? fn(b) : b)));
  }

  async function send(url: string, method: string, body?: unknown): Promise<Response | null> {
    setStatus("Saving…");
    try {
      const res = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) throw new Error("save_failed");
      setStatus("Saved");
      return res;
    } catch {
      setStatus("Couldn’t save — check your connection and try again.");
      return null;
    }
  }

  async function createBudget(name: string, copyFromId: string | null): Promise<boolean> {
    const res = await send("/api/budget", "POST", { userId, name, copyFromId });
    if (!res) return false;
    const { budget: created } = (await res.json()) as { budget: BudgetWithLines };
    setBudgets((bs) => [...bs, created]);
    setSelectedId(created.id);
    setCreating(false);
    return true;
  }

  function saveBudget(patch: BudgetPatch) {
    if (!budget) return;
    update(budget.id, (b) => ({ ...b, ...patch }));
    void send(`/api/budget/${budget.id}`, "PATCH", patch);
  }

  async function setArchived(archive: boolean) {
    if (!budget) return;
    const res = await send(`/api/budget/${budget.id}`, "PATCH", { archived: archive });
    if (!res) return;
    update(budget.id, (b) => ({ ...b, archived_at: archive ? new Date().toISOString() : null }));
    setStatus(
      archive
        ? `“${budget.name}” moved to Past budgets. Its bill reminders are turned off.`
        : `“${budget.name}” is a current budget again.`
    );
  }

  function saveLine(id: string, patch: LinePatch) {
    if (!budget) return;
    update(budget.id, (b) => ({ ...b, lines: b.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
    void send(`/api/budget/lines/${id}`, "PATCH", patch);
  }

  async function addLine(section: BudgetSection) {
    if (!budget) return;
    const res = await send(`/api/budget/${budget.id}/lines`, "POST", { section });
    if (!res) return;
    const { line } = (await res.json()) as { line: BudgetLineRow };
    update(budget.id, (b) => ({ ...b, lines: [...b.lines, line] }));
  }

  async function removeLine(id: string) {
    if (!budget) return;
    if (!(await send(`/api/budget/lines/${id}`, "DELETE"))) return;
    update(budget.id, (b) => ({ ...b, lines: b.lines.filter((l) => l.id !== id) }));
  }

  if (failed) {
    return (
      <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
        Couldn&apos;t load the budget.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => {
            setFailed(false);
            setReloadKey((k) => k + 1);
          }}
        >
          Try again
        </button>
      </p>
    );
  }
  if (!loaded) return <p className="text-sm text-tal-plum-soft">Loading budget…</p>;

  const importButton = (
    <BudgetImportButton
      userId={userId}
      period={budget?.period ?? "monthly"}
      currentBudget={budget && !creating ? { id: budget.id, name: budget.name } : null}
      titles={budget ? Object.fromEntries(BUCKETS.map((b) => [b, bucketTitle(budget, b)])) : undefined}
      onImported={(message, newId) => {
        setCreating(false);
        if (newId) setSelectedId(newId);
        setReloadKey((k) => k + 1);
        setStatus(message);
      }}
    />
  );
  const barButtons =
    budget && !creating ? (
      <>
        {importButton}
        <PdfActions
          downloadUrl={`/api/export/doc?${new URLSearchParams({ kind: "budget", user: userId, id: budget.id })}`}
          shareUrl="/api/export/doc/email"
          shareBody={{ kind: "budget", user: userId, id: budget.id }}
          shareLabel="A PDF of this budget, made by The Adulting Life"
          what="this budget"
        />
      </>
    ) : (
      importButton
    );

  if (!budget || creating) {
    return (
      <NewBudgetForm
        first={!budget}
        copyFrom={budget}
        onCreate={createBudget}
        onCancel={budget ? () => setCreating(false) : undefined}
        importButton={barButtons}
      />
    );
  }

  const summary = summariseBudget(budget, budget.lines);
  const linesFor = (section: BudgetSection) => budget.lines.filter((l) => l.section === section);
  const period = PERIOD_LABELS[budget.period].toLowerCase();
  const isArchived = !!budget.archived_at;

  return (
    <div className="space-y-6">
      <BudgetBar
        // Remount when switching budgets so the name field re-seeds.
        key={budget.id}
        budget={budget}
        current={current}
        archived={archived}
        onSelect={setSelectedId}
        onRename={(name) => saveBudget({ name })}
        onNew={() => setCreating(true)}
        onArchive={setArchived}
        importButton={barButtons}
      />
      {isArchived && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This is a past budget, kept for reference. You can still view and edit it; its bill
          reminders are off. Use <strong>Restore</strong> above to make it current again.
        </p>
      )}
      <Section title="1. Choose your period">
        <div className="p-4 flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="block text-sm text-tal-plum mb-1.5">My budget period</span>
            <select
              value={budget.period}
              onChange={(e) => saveBudget({ period: e.target.value as BudgetWithLines["period"] })}
              className="h-10 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm text-tal-plum mb-1.5">Starting date</span>
            <input
              type="date"
              value={budget.start_date ?? ""}
              onChange={(e) => saveBudget({ start_date: e.target.value || null })}
              className="h-10 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
            />
          </label>
          <span className="text-xs text-tal-plum-soft ml-auto" aria-live="polite">
            {status}
          </span>
        </div>
        <Notes
          items={[
            `Use the same period for every amount you enter — everything below is ${period}.`,
            "Changing the period doesn’t convert amounts. Re-enter them for your new period.",
          ]}
        />
      </Section>

      <Section title="2. Money coming in">
        <p className="px-4 pt-3 text-sm text-tal-plum-soft">
          Add the money you expect to receive after tax during this period.
        </p>
        <ul className="p-4 space-y-2">
          {linesFor("income").map((l) => (
            <LineRow
              key={l.id}
              line={l}
              withBill={false}
              today={null}
              onSave={(patch) => saveLine(l.id, patch)}
              onRemove={() => removeLine(l.id)}
            />
          ))}
        </ul>
        <div className="px-4 pb-4 flex items-center justify-between gap-3 flex-wrap">
          <AddLineButton onClick={() => addLine("income")} label="Add income" />
          <div className="text-sm text-tal-plum">
            Total income: <span className="font-semibold">{money(summary.totalIncome)}</span>
          </div>
        </div>
      </Section>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl text-tal-plum">3. Give every dollar a job</h2>
          <p className="text-sm text-tal-plum-soft mt-1">
            Start with 60 / 20 / 10 / 10. You can adjust the percentages to suit your life.
          </p>
        </div>
        <BudgetChartsButton
          lines={budget.lines}
          summary={summary}
          periodLabel={period}
          titles={Object.fromEntries(BUCKETS.map((b) => [b, bucketTitle(budget, b)])) as Record<Bucket, string>}
        />
      </div>

      {BUCKETS.map((bucket) => (
        <BucketSection
          key={bucket}
          bucket={bucket}
          lines={linesFor(bucket)}
          totals={summary.buckets[bucket]}
          onPct={(pct) => saveBudget({ [BUCKET_INFO[bucket].pctField]: pct })}
          title={bucketTitle(budget, bucket)}
          onRename={(name) =>
            saveBudget({
              // Blank, or the template's own name, goes back to the default.
              [BUCKET_INFO[bucket].titleField]:
                name && name !== BUCKET_INFO[bucket].title ? name : null,
            })
          }
          onSaveLine={saveLine}
          onRemoveLine={removeLine}
          onAddLine={() => addLine(bucket)}
        />
      ))}

      <Section title="Summary">
        <dl className="divide-y divide-tal-line">
          <SummaryRow
            label="Total percentages"
            value={`${summary.pctTotal}%`}
            warn={summary.pctOk ? null : "Adjust to total 100%"}
          />
          <SummaryRow label="Total income" value={money(summary.totalIncome)} />
          <SummaryRow label="Total money assigned" value={money(summary.totalAssigned)} />
          <SummaryRow
            label="Money left to assign"
            value={money(summary.leftToAssign)}
            strong
            negative={(summary.leftToAssign ?? 0) < 0}
          />
        </dl>
        <Notes
          items={[
            "A negative amount means you have assigned more money than your plan allows.",
            "For yearly bills, enter only the amount to put aside this period.",
            "Turn on an app reminder for a bill to see it in Reminders and on your dashboard.",
          ]}
        />
      </Section>
    </div>
  );
}

function BucketSection({
  bucket,
  lines,
  totals,
  onPct,
  onSaveLine,
  onRemoveLine,
  onAddLine,
  title,
  onRename,
}: {
  bucket: Bucket;
  /** The heading shown — the person's own name for this bucket, or the default. */
  title: string;
  onRename: (name: string | null) => void;
  lines: BudgetLineRow[];
  totals: { pct: number; suggested: number | null; assigned: number; left: number | null };
  onPct: (pct: number) => void;
  onSaveLine: (id: string, patch: LinePatch) => void;
  onRemoveLine: (id: string) => void;
  onAddLine: () => void;
}) {
  const info = BUCKET_INFO[bucket];
  // Bills only need "today" to show when a repeating bill is next due.
  const [today] = useState(() => localToday(Intl.DateTimeFormat().resolvedOptions().timeZone));
  return (
    <section className="rounded-2xl border border-tal-line bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-black text-white flex items-center justify-between gap-3 flex-wrap">
        <BucketTitle key={title} title={title} defaultTitle={info.title} onRename={onRename} />
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            <span className="sr-only">{title} percentage</span>
            <PctInput value={totals.pct} onCommit={onPct} />%
          </label>
          <span className="text-white/80">
            Suggested amount: <span className="text-white font-medium">{money(totals.suggested)}</span>
          </span>
        </div>
      </div>
      <ul className="p-4 space-y-2">
        {lines.map((l) => (
          <LineRow
            key={l.id}
            line={l}
            withBill={info.bills}
            today={info.bills ? today : null}
            onSave={(patch) => onSaveLine(l.id, patch)}
            onRemove={() => onRemoveLine(l.id)}
          />
        ))}
      </ul>
      <div className="px-4 pb-4 flex items-center justify-between gap-3 flex-wrap">
        <AddLineButton onClick={onAddLine} label="Add a line" />
        <div className="flex items-center gap-4 text-sm text-tal-plum">
          <span>
            Total assigned: <span className="font-semibold">{money(totals.assigned)}</span>
          </span>
          <span>
            Left to assign:{" "}
            <span className={"font-semibold " + ((totals.left ?? 0) < 0 ? "text-red-700" : "")}>
              {money(totals.left)}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}

function LineRow({
  line,
  withBill,
  today,
  onSave,
  onRemove,
}: {
  line: BudgetLineRow;
  withBill: boolean;
  today: string | null;
  onSave: (patch: LinePatch) => void;
  onRemove: () => void;
}) {
  const nextDue =
    withBill && today && line.due_date ? nextDueDate(line.due_date, line.repeats, today) : null;
  return (
    <li className="rounded-xl border border-tal-line bg-tal-cream-soft/40 p-2">
      <div
        className={
          "grid gap-2 items-start " +
          (withBill
            ? "sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_8rem_9.5rem_9rem_9.5rem_minmax(0,1.2fr)_2rem]"
            : "sm:grid-cols-[minmax(0,2fr)_9rem_minmax(0,1.5fr)_2rem]")
        }
      >
        <TextCell
          label={line.section === "income" ? "Income source" : "Give this money a job"}
          value={line.label}
          onCommit={(v) => onSave({ label: v ?? "" })}
        />
        <AmountCell label="Amount this period" value={line.amount} onCommit={(v) => onSave({ amount: v })} />
        {withBill && (
          <>
            <label className="block">
              <CellLabel>Next bill due</CellLabel>
              <input
                type="date"
                value={line.due_date ?? ""}
                onChange={(e) => {
                  const due = e.target.value || null;
                  // Most bills repeat, so a new due date starts as monthly.
                  onSave(
                    due && !line.repeats
                      ? { due_date: due, repeats: DEFAULT_REPEATS }
                      : { due_date: due }
                  );
                }}
                className="w-full h-9 rounded-lg border border-tal-line bg-white px-2 text-sm text-tal-plum"
              />
              {nextDue && nextDue !== line.due_date && (
                <span className="block mt-0.5 text-[11px] text-tal-plum-soft">
                  Next: {format(parseISO(nextDue), "d MMM yyyy")}
                </span>
              )}
            </label>
            <label className="block">
              <CellLabel>Repeats</CellLabel>
              <select
                value={line.repeats ?? ""}
                disabled={!line.due_date}
                onChange={(e) => onSave({ repeats: (e.target.value || null) as Repeats | null })}
                className="w-full h-9 rounded-lg border border-tal-line bg-white px-2 text-sm text-tal-plum disabled:opacity-50"
              >
                <option value="">Doesn&apos;t repeat</option>
                {REPEATS.map((r) => (
                  <option key={r} value={r}>
                    {REPEAT_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <CellLabel>App reminder?</CellLabel>
              <select
                value={line.remind_days_before == null ? "" : String(line.remind_days_before)}
                disabled={!line.due_date}
                onChange={(e) =>
                  onSave({ remind_days_before: e.target.value === "" ? null : Number(e.target.value) })
                }
                className="w-full h-9 rounded-lg border border-tal-line bg-white px-2 text-sm text-tal-plum disabled:opacity-50"
              >
                <option value="">No reminder</option>
                {REMIND_OPTIONS.map((o) => (
                  <option key={o.days} value={o.days}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <TextCell label="Notes" value={line.notes} onCommit={(v) => onSave({ notes: v })} />
        <div className="flex sm:justify-center sm:pt-5">
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${line.label || "line"}`}
            title="Remove line"
            className="h-9 w-8 rounded-lg text-tal-plum-soft hover:bg-red-50 hover:text-red-700"
          >
            ×
          </button>
        </div>
      </div>
    </li>
  );
}

function CellLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] uppercase tracking-widest text-tal-plum-soft mb-1">
      {children}
    </span>
  );
}

function TextCell({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string | null;
  onCommit: (value: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  return (
    <label className="block">
      <CellLabel>{label}</CellLabel>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const clean = draft.trim() || null;
          if (clean !== (value || null)) onCommit(clean);
        }}
        className="w-full h-9 rounded-lg border border-tal-line bg-white px-2 text-sm text-tal-plum focus:outline-none focus:ring-2 focus:ring-tal-plum/30"
      />
    </label>
  );
}

function AmountCell({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number | null;
  onCommit: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  return (
    <label className="block">
      <CellLabel>{label}</CellLabel>
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-tal-plum-soft">$</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = draft.trim() === "" ? null : Number(draft);
            const clean = n == null || !Number.isFinite(n) ? null : Math.round(n * 100) / 100;
            setDraft(clean == null ? "" : String(clean));
            if (clean !== value) onCommit(clean);
          }}
          className="w-full h-9 rounded-lg border border-tal-line bg-white pl-5 pr-2 text-sm text-tal-plum focus:outline-none focus:ring-2 focus:ring-tal-plum/30"
        />
      </div>
    </label>
  );
}

function PctInput({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      max={100}
      step="1"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = Number(draft);
        const clean = Number.isFinite(n) ? Math.min(Math.max(Math.round(n * 100) / 100, 0), 100) : value;
        setDraft(String(clean));
        if (clean !== value) onCommit(clean);
      }}
      className="w-16 h-8 rounded-lg border border-white/30 bg-white/10 px-2 text-sm text-white text-right focus:outline-none focus:ring-2 focus:ring-white/40"
    />
  );
}

function AddLineButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 px-3 rounded-xl border border-tal-line bg-white text-sm font-medium text-tal-plum hover:bg-tal-cream-soft"
    >
      + {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-tal-line bg-white overflow-hidden">
      <h2 className="px-4 py-2.5 text-sm font-semibold bg-black text-white">{title}</h2>
      {children}
    </section>
  );
}

function Notes({ items }: { items: string[] }) {
  return (
    <ul className="border-t border-tal-line bg-tal-cream-soft/50 px-4 py-3 text-xs text-tal-plum-soft space-y-1">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
  negative = false,
  warn = null,
}: {
  label: string;
  value: string;
  strong?: boolean;
  negative?: boolean;
  warn?: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className={"text-sm text-tal-plum " + (strong ? "font-semibold" : "")}>{label}</dt>
      <dd className="text-sm text-right">
        <span className={(strong ? "font-semibold " : "") + (negative ? "text-red-700" : "text-tal-plum")}>
          {value}
        </span>
        {warn && <span className="ml-2 text-amber-700 font-medium">{warn}</span>}
      </dd>
    </div>
  );
}

/** Bucket heading the person can rename in place (blank restores the default). */
function BucketTitle({
  title,
  defaultTitle,
  onRename,
}: {
  title: string;
  defaultTitle: string;
  onRename: (name: string | null) => void;
}) {
  const [draft, setDraft] = useState(title);
  return (
    <label className="flex items-center gap-2 min-w-0">
      <span className="sr-only">Name of this section (default “{defaultTitle}”)</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const clean = draft.trim();
          if (!clean) setDraft(defaultTitle);
          if ((clean || defaultTitle) !== title) onRename(clean || null);
        }}
        maxLength={60}
        title="Click to rename this section"
        className="min-w-0 w-56 max-w-full bg-transparent text-sm font-semibold uppercase tracking-wide text-white border-b border-dashed border-white/40 hover:border-white focus:border-white focus:outline-none px-0.5 py-0.5"
      />
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60 shrink-0" aria-hidden>
        <path d="M4 20h4L19 9l-4-4L4 16v4z" />
      </svg>
    </label>
  );
}

/** Budget picker, name, and New / Archive / Restore actions. */
function BudgetBar({
  budget,
  current,
  archived,
  onSelect,
  onRename,
  onNew,
  onArchive,
  importButton,
}: {
  budget: BudgetWithLines;
  current: BudgetWithLines[];
  archived: BudgetWithLines[];
  onSelect: (id: string) => void;
  onRename: (name: string) => void;
  onNew: () => void;
  onArchive: (archive: boolean) => void;
  importButton: React.ReactNode;
}) {
  const [name, setName] = useState(budget.name);
  return (
    <div className="rounded-2xl border border-tal-line bg-white p-4 flex flex-wrap items-end gap-3">
      {current.length + archived.length > 1 && (
        <label className="block">
          <span className="block text-xs uppercase tracking-widest text-tal-plum-soft mb-1">Budget</span>
          <select
            value={budget.id}
            onChange={(e) => onSelect(e.target.value)}
            className="h-10 max-w-xs rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
          >
            {current.length > 0 && (
              <optgroup label="Current budgets">
                {current.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            )}
            {archived.length > 0 && (
              <optgroup label="Past budgets">
                {archived.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (archived)
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      )}
      <label className="block min-w-0 flex-1">
        <span className="block text-xs uppercase tracking-widest text-tal-plum-soft mb-1">Budget name</span>
        <input
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const clean = name.trim();
            if (!clean) setName(budget.name);
            else if (clean !== budget.name) onRename(clean);
          }}
          placeholder="e.g. 2026–2027"
          className="w-full max-w-sm h-10 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
        />
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onNew}
          className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium"
        >
          + New budget
        </button>
        {importButton}
        <button
          type="button"
          onClick={() => onArchive(!budget.archived_at)}
          className="h-10 px-4 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft"
        >
          {budget.archived_at ? "Restore" : "Archive"}
        </button>
      </div>
    </div>
  );
}

/** Start a budget: name it, then either copy an existing one or use the template. */
function NewBudgetForm({
  first,
  copyFrom,
  onCreate,
  onCancel,
  importButton,
}: {
  first: boolean;
  copyFrom: BudgetWithLines | null;
  onCreate: (name: string, copyFromId: string | null) => Promise<boolean>;
  onCancel?: () => void;
  importButton: React.ReactNode;
}) {
  const [name, setName] = useState(first ? "My budget" : "");
  const [mode, setMode] = useState<"copy" | "fresh">(copyFrom ? "copy" : "fresh");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        // Shown here: the page's usual status line isn't visible on this form.
        if (!name.trim()) {
          setError("Give your new budget a name first — e.g. Christmas 2026.");
          return;
        }
        setError(null);
        setBusy(true);
        const ok = await onCreate(name.trim(), mode === "copy" && copyFrom ? copyFrom.id : null);
        if (!ok) {
          setBusy(false);
          setError("Couldn’t create the budget — check your connection and try again.");
        }
      }}
      className="rounded-2xl border border-tal-line bg-white p-6 space-y-4"
    >
      <div>
        <h2 className="font-display text-xl text-tal-plum mb-1">
          {first ? "Money & Me budget" : "Start a new budget"}
        </h2>
        <p className="text-sm text-tal-plum-soft max-w-xl">
          {first
            ? "Choose a period, add the money you expect to receive, then give every dollar a job across Needs, Emergencies, Wants and Goals savings. You can rename, remove and add lines to suit your life."
            : "Give it a name — e.g. Christmas 2026, or the financial year. You can have as many budgets as you like; your others stay where they are, and you don't need to archive anything."}
        </p>
      </div>
      <label className="block max-w-sm">
        <span className="block text-sm text-tal-plum mb-1.5">Budget name</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          maxLength={100}
          autoFocus={!first}
          placeholder="Type a name, e.g. Christmas 2026"
          className="w-full h-10 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
        />
      </label>
      {copyFrom && (
        <fieldset className="space-y-2">
          <legend className="text-sm text-tal-plum mb-1">Start from</legend>
          <label className="flex items-start gap-2 text-sm text-tal-plum">
            <input type="radio" checked={mode === "copy"} onChange={() => setMode("copy")} className="mt-1" />
            <span>
              A copy of “{copyFrom.name}” — same lines, amounts, bills and section names, ready to
              update
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-tal-plum">
            <input type="radio" checked={mode === "fresh"} onChange={() => setMode("fresh")} className="mt-1" />
            <span>A fresh budget from the template</span>
          </label>
        </fieldset>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
        >
          {busy ? "Setting up…" : first ? "Start my budget" : "Create budget"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft"
          >
            Cancel
          </button>
        )}
      </div>
      <div className="pt-4 border-t border-tal-line flex flex-wrap items-center gap-3">
        <span className="text-sm text-tal-plum-soft">Already have a budget in Excel, a PDF or on paper?</span>
        {importButton}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
