"use client";

import { useEffect, useState } from "react";
import type { BudgetLineRow } from "@/lib/db/budgets";
import { BUCKETS, BUCKET_INFO, type BudgetSection, type BudgetSummary } from "@/lib/budget";

/*
 * "View as charts" popup for the budget: one donut for how income is split
 * across the four buckets, then one donut per section showing its lines.
 * Part-to-whole at a glance only — each donut has at most six slices (extra
 * lines fold into "Other") and a legend with the amounts and percentages,
 * so nothing relies on colour alone.
 */

// Categorical slots in fixed order (validated for colour-vision deficiency
// against a light surface); grey is reserved for "Other" / "Not yet assigned".
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
const NEUTRAL = "#b3b1aa";
const MAX_SLICES = 6;

interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
}

const money = (n: number) => n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });

const SECTION_TITLES: Record<BudgetSection, string> = {
  income: "Money coming in",
  needs: BUCKET_INFO.needs.title,
  emergencies: BUCKET_INFO.emergencies.title,
  wants: BUCKET_INFO.wants.title,
  goals: BUCKET_INFO.goals.title,
};

/** A section's lines as slices: colour follows the line's position in the
 *  section, and anything past five lines folds into a grey "Other". */
function sectionSlices(lines: BudgetLineRow[]): Slice[] {
  const withAmount = lines
    .map((l, i) => ({ line: l, index: i, value: Number(l.amount ?? 0) }))
    .filter((x) => x.value > 0);
  if (withAmount.length <= MAX_SLICES - 1) {
    return withAmount.map((x, i) => ({
      key: x.line.id,
      label: x.line.label.trim() || "Untitled line",
      value: x.value,
      color: SERIES[i % SERIES.length],
    }));
  }
  const keep = new Set(
    [...withAmount]
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_SLICES - 1)
      .map((x) => x.line.id)
  );
  const kept = withAmount.filter((x) => keep.has(x.line.id));
  const other = withAmount.filter((x) => !keep.has(x.line.id)).reduce((t, x) => t + x.value, 0);
  return [
    ...kept.map((x, i) => ({
      key: x.line.id,
      label: x.line.label.trim() || "Untitled line",
      value: x.value,
      color: SERIES[i],
    })),
    { key: "other", label: "Other", value: other, color: NEUTRAL },
  ];
}

export function BudgetChartsButton({
  lines,
  summary,
  periodLabel,
}: {
  lines: BudgetLineRow[];
  summary: BudgetSummary;
  /** e.g. "monthly" — amounts are per budget period. */
  periodLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-tal-line bg-white text-sm font-medium text-tal-plum hover:bg-tal-cream-soft"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 3a9 9 0 1 0 9 9h-9V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        View as charts
      </button>
      {open && (
        <ChartsDialog
          lines={lines}
          summary={summary}
          periodLabel={periodLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ChartsDialog({
  lines,
  summary,
  periodLabel,
  onClose,
}: {
  lines: BudgetLineRow[];
  summary: BudgetSummary;
  periodLabel: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const overview: Slice[] = BUCKETS.map((b, i) => ({
    key: b,
    label: BUCKET_INFO[b].title,
    value: Math.max(summary.buckets[b].assigned, 0),
    color: SERIES[i],
  }));
  if ((summary.leftToAssign ?? 0) > 0) {
    overview.push({
      key: "unassigned",
      label: "Not yet assigned",
      value: summary.leftToAssign as number,
      color: NEUTRAL,
    });
  }

  const sections: BudgetSection[] = ["income", ...BUCKETS];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-charts-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 text-left"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-tal-line flex items-start justify-between gap-3">
          <div>
            <h3 id="budget-charts-title" className="font-display text-lg text-tal-plum">
              My budget at a glance
            </h3>
            <p className="text-xs text-tal-plum-soft mt-0.5">
              Amounts are {periodLabel}, as entered in your budget.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full text-tal-plum-soft hover:bg-tal-cream-soft hover:text-tal-plum"
          >
            ×
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-6">
          <ChartCard
            title="Where my money goes"
            subtitle={
              summary.totalIncome != null
                ? `Total income ${money(summary.totalIncome)}`
                : "Add your income to see how it's split"
            }
            slices={overview}
            large
          />
          <div className="grid gap-4 md:grid-cols-2">
            {sections.map((s) => (
              <ChartCard
                key={s}
                title={SECTION_TITLES[s]}
                slices={sectionSlices(lines.filter((l) => l.section === s))}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  slices,
  large = false,
}: {
  title: string;
  subtitle?: string;
  slices: Slice[];
  large?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const total = slices.reduce((t, s) => t + s.value, 0);
  const active = slices.find((s) => s.key === hover) ?? null;
  const pct = (v: number) => (total > 0 ? `${Math.round((v / total) * 100)}%` : "0%");

  return (
    <section className="rounded-2xl border border-tal-line p-4">
      <h4 className="font-display text-tal-plum">{title}</h4>
      {subtitle && <p className="text-xs text-tal-plum-soft">{subtitle}</p>}
      {total <= 0 ? (
        <p className="mt-3 text-sm text-tal-plum-soft">No amounts entered yet.</p>
      ) : (
        <div className={"mt-3 flex items-center gap-5 " + (large ? "flex-col sm:flex-row" : "flex-col sm:flex-row")}>
          <Donut
            slices={slices}
            total={total}
            size={large ? 220 : 160}
            hover={hover}
            onHover={setHover}
            centre={
              active
                ? { top: money(active.value), bottom: `${active.label} · ${pct(active.value)}` }
                : { top: money(total), bottom: "Total" }
            }
          />
          <ul className="w-full space-y-1.5 text-sm">
            {slices.map((s) => (
              <li
                key={s.key}
                onMouseEnter={() => setHover(s.key)}
                onMouseLeave={() => setHover(null)}
                className={
                  "flex items-center gap-2 rounded-lg px-2 py-1 transition-colors " +
                  (hover === s.key ? "bg-tal-cream-soft" : "")
                }
              >
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                <span className="min-w-0 flex-1 truncate text-tal-plum">{s.label}</span>
                <span className="tabular-nums text-tal-plum">{money(s.value)}</span>
                <span className="w-10 text-right tabular-nums text-tal-plum-soft">{pct(s.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Donut({
  slices,
  total,
  size,
  hover,
  onHover,
  centre,
}: {
  slices: Slice[];
  total: number;
  size: number;
  hover: string | null;
  onHover: (key: string | null) => void;
  centre: { top: string; bottom: string };
}) {
  const r = size / 2;
  const thickness = size * 0.17;
  const mid = r - thickness / 2 - 2;
  const circumference = 2 * Math.PI * mid;
  // Where each slice starts along the ring.
  const lengths = slices.map((s) => (s.value / total) * circumference);
  const starts = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={slices.map((s) => `${s.label} ${money(s.value)}`).join(", ")}
      className="shrink-0"
    >
      <g transform={`rotate(-90 ${r} ${r})`}>
        {slices.map((s, i) => {
          const length = lengths[i];
          // A 2px surface-coloured gap separates neighbouring slices.
          const gap = slices.length > 1 ? Math.min(2, length / 2) : 0;
          const dash = `${Math.max(length - gap, 0)} ${circumference}`;
          return (
            <circle
              key={s.key}
              cx={r}
              cy={r}
              r={mid}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === s.key ? thickness + 6 : thickness}
              strokeDasharray={dash}
              strokeDashoffset={-starts[i]}
              opacity={hover && hover !== s.key ? 0.45 : 1}
              onMouseEnter={() => onHover(s.key)}
              onMouseLeave={() => onHover(null)}
              className="transition-all cursor-default"
            >
              <title>{`${s.label}: ${money(s.value)}`}</title>
            </circle>
          );
        })}
      </g>
      <text
        x={r}
        y={r - 2}
        textAnchor="middle"
        className="fill-tal-plum"
        style={{ fontSize: size * 0.085, fontWeight: 600 }}
      >
        {centre.top}
      </text>
      <text
        x={r}
        y={r + size * 0.085}
        textAnchor="middle"
        className="fill-tal-plum-soft"
        style={{ fontSize: Math.max(size * 0.055, 10) }}
      >
        {centre.bottom.length > 24 ? centre.bottom.slice(0, 23) + "…" : centre.bottom}
      </text>
    </svg>
  );
}
