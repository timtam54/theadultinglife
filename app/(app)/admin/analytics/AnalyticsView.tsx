"use client";

import { useEffect, useMemo, useState } from "react";

interface ActionPageSum {
  action: string;
  page: string;
  hits: number;
}

interface SliceData {
  name: string;
  value: number;
  color: string;
}

const MIN_DAYS_AGO = 2;
const MAX_DAYS_AGO = 62;
const DEFAULT_DAYS_AGO = 30;
const TOP_N = 12;

const PALETTE = [
  "#0891b2", "#7c3aed", "#db2777", "#16a34a", "#f59e0b",
  "#ef4444", "#0ea5e9", "#8b5cf6", "#10b981", "#f97316",
  "#6366f1", "#14b8a6", "#e11d48", "#84cc16", "#a855f7",
];

function fromDateString(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgoLabel(daysAgo: number): string {
  if (daysAgo === 1) return "1 day ago";
  if (daysAgo < 7) return `${daysAgo} days ago`;
  if (daysAgo < 14) return "1 week ago";
  if (daysAgo < 30) return `${Math.round(daysAgo / 7)} weeks ago`;
  if (daysAgo < 60) return `${Math.round(daysAgo / 30)} month ago`;
  return `${Math.round(daysAgo / 30)} months ago`;
}

function aggregate(rows: ActionPageSum[], key: "action" | "page"): SliceData[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const name = (r[key] || "unknown").toString();
    counts.set(name, (counts.get(name) ?? 0) + (r.hits || 0));
  }
  const sorted = Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, TOP_N);
  const rest = sorted.slice(TOP_N);
  if (rest.length > 0) {
    top.push({
      name: `Other (${rest.length})`,
      value: rest.reduce((s, r) => s + r.value, 0),
    });
  }
  return top.map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] }));
}

export function AnalyticsView() {
  const [rows, setRows] = useState<ActionPageSum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysAgo, setDaysAgo] = useState(DEFAULT_DAYS_AGO);
  const [pendingDaysAgo, setPendingDaysAgo] = useState(DEFAULT_DAYS_AGO);

  const fromDate = useMemo(() => fromDateString(daysAgo), [daysAgo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/analytics?from=${fromDate}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data = (await res.json()) as { rows: ActionPageSum[] };
        if (!cancelled) setRows(data.rows ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setRows([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromDate]);

  const actionData = useMemo(() => aggregate(rows, "action"), [rows]);
  const pageData = useMemo(() => aggregate(rows, "page"), [rows]);
  const totalHits = useMemo(
    () => rows.reduce((s, r) => s + (r.hits || 0), 0),
    [rows]
  );

  return (
    <main className="text-tal-plum">
      <div className="rounded-2xl bg-black text-white px-5 py-4 mb-4 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/15"
              aria-hidden
            >
              <BarChartIcon />
            </span>
            <h1 className="font-display text-2xl leading-tight">Analytics</h1>
          </div>
          <div className="text-sm text-white/80">
            {totalHits.toLocaleString()} total hits
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-tal-line bg-white p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div>
            <label
              htmlFor="daysAgoSlider"
              className="text-sm font-semibold text-tal-plum"
            >
              From: {daysAgoLabel(pendingDaysAgo)}
            </label>
            <div className="text-xs text-tal-plum-soft">
              {fromDateString(pendingDaysAgo)} onwards
            </div>
          </div>
          <div className="text-xs text-tal-plum-soft">
            {pendingDaysAgo !== daysAgo
              ? "Release to apply"
              : isLoading
                ? "Loading…"
                : ""}
          </div>
        </div>
        <input
          id="daysAgoSlider"
          type="range"
          min={MIN_DAYS_AGO}
          max={MAX_DAYS_AGO}
          value={pendingDaysAgo}
          onChange={(e) => setPendingDaysAgo(parseInt(e.target.value, 10))}
          onMouseUp={() => setDaysAgo(pendingDaysAgo)}
          onTouchEnd={() => setDaysAgo(pendingDaysAgo)}
          onKeyUp={() => setDaysAgo(pendingDaysAgo)}
          className="w-full accent-tal-plum"
        />
        <div className="flex justify-between text-xs text-tal-plum-soft mt-1">
          <span>2 months ago</span>
          <span>1 month ago</span>
          <span>2 days ago</span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-tal-plum-soft">
          Loading analytics…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-tal-line">
          <div className="text-tal-plum-soft mx-auto mb-3">
            <BarChartIcon />
          </div>
          <h3 className="text-lg font-medium text-tal-plum mb-1">
            No analytics data for this range
          </h3>
          <p className="text-sm text-tal-plum-soft">
            Widen the slider or wait for more activity.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Actions by hit count" data={actionData} />
          <ChartCard title="Pages by hit count" data={pageData} />
        </div>
      )}
    </main>
  );
}

function ChartCard({ title, data }: { title: string; data: SliceData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const visible = total > 0 ? data.filter((d) => (d.value / total) * 100 >= 1) : data;

  return (
    <div className="rounded-2xl border border-tal-line bg-white p-4">
      <h3 className="font-display text-lg text-tal-plum mb-3">{title}</h3>
      {visible.length === 0 ? (
        <div className="text-center py-12 text-tal-plum-soft">No data</div>
      ) : (
        <>
          <Donut data={visible} total={total} />
          <div className="mt-3 max-h-56 overflow-y-auto border-t border-tal-line pt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-tal-plum-soft text-xs uppercase">
                  <th className="text-left py-1">Name</th>
                  <th className="text-right py-1">Hits</th>
                  <th className="text-right py-1">%</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((d) => {
                  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={d.name} className="border-t border-tal-line/60">
                      <td className="py-1">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded-sm"
                            style={{ backgroundColor: d.color }}
                          />
                          <span className="text-tal-plum">{d.name}</span>
                        </span>
                      </td>
                      <td className="py-1 text-right font-medium text-tal-plum">
                        {d.value.toLocaleString()}
                      </td>
                      <td className="py-1 text-right text-tal-plum-soft">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// Lightweight SVG donut — avoids adding a charting library.
function Donut({ data, total }: { data: SliceData[]; total: number }) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 120;
  const rInner = 70;

  const slices = data.reduce<
    Array<SliceData & { start: number; end: number }>
  >((acc, d) => {
    const running = acc.length ? acc[acc.length - 1].end * total : 0;
    const start = running / total;
    const end = (running + d.value) / total;
    acc.push({ ...d, start, end });
    return acc;
  }, []);

  return (
    <div className="flex justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Distribution chart"
      >
        {slices.length === 1 ? (
          // Single-slice case: render as full ring.
          <>
            <circle cx={cx} cy={cy} r={rOuter} fill={slices[0].color} />
            <circle cx={cx} cy={cy} r={rInner} fill="white" />
          </>
        ) : (
          slices.map((s, i) => (
            <path
              key={i}
              d={arcPath(cx, cy, rInner, rOuter, s.start, s.end)}
              fill={s.color}
            />
          ))
        )}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-tal-plum"
          style={{ fontSize: 12 }}
        >
          Total
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-tal-plum font-semibold"
          style={{ fontSize: 18 }}
        >
          {total.toLocaleString()}
        </text>
      </svg>
    </div>
  );
}

function arcPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startFrac: number,
  endFrac: number
): string {
  const startAngle = startFrac * Math.PI * 2 - Math.PI / 2;
  const endAngle = endFrac * Math.PI * 2 - Math.PI / 2;
  const large = endFrac - startFrac > 0.5 ? 1 : 0;

  const x1 = cx + rOuter * Math.cos(startAngle);
  const y1 = cy + rOuter * Math.sin(startAngle);
  const x2 = cx + rOuter * Math.cos(endAngle);
  const y2 = cy + rOuter * Math.sin(endAngle);
  const x3 = cx + rInner * Math.cos(endAngle);
  const y3 = cy + rInner * Math.sin(endAngle);
  const x4 = cx + rInner * Math.cos(startAngle);
  const y4 = cy + rInner * Math.sin(startAngle);

  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

function BarChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20V10M10 20V4M16 20v-7M4 20h18"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
