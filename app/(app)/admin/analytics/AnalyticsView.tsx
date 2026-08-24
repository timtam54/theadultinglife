"use client";

import { useEffect, useMemo, useState } from "react";

interface Summary {
  windowFrom: string;
  windowTo: string;
  totalEvents: number;
  eventCounts: { action: string; hits: number }[];
  pageHits: { page: string; hits: number }[];
  activeUsers: {
    daily: { date: string; users: number }[];
    weekly: { weekStart: string; users: number }[];
    windowTotal: number;
  };
  funnel: { step: string; label: string; users: number; pct: number }[];
  adoption: { feature: string; label: string; users: number; pct: number }[];
  devices: { device: string; hits: number }[];
  totalUsers: number;
}

const MIN_DAYS_AGO = 2;
const MAX_DAYS_AGO = 62;
const DEFAULT_DAYS_AGO = 30;

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

const DEVICE_COLORS: Record<string, string> = {
  web: "#0891b2",
  pwa: "#7c3aed",
  "ios-safari": "#f59e0b",
  "android-chrome": "#16a34a",
  unknown: "#9ca3af",
};

export function AnalyticsView() {
  const [data, setData] = useState<Summary | null>(null);
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
        const json = (await res.json()) as Summary;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setData(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromDate]);

  const totalDeviceHits = useMemo(
    () => (data ? data.devices.reduce((s, d) => s + d.hits, 0) : 0),
    [data]
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
            <div>
              <h1 className="font-display text-2xl leading-tight">Analytics</h1>
              <p className="text-xs text-white/70 mt-0.5 max-w-lg">
                How people use the app — never what they type. No document
                names, form answers, notes, or AI prompts are shown here.
              </p>
            </div>
          </div>
          <div className="text-sm text-white/80 text-right">
            {data && (
              <>
                <div>{data.totalEvents.toLocaleString()} events</div>
                <div className="text-xs text-white/60">
                  {data.activeUsers.windowTotal} active users · {data.totalUsers} total
                </div>
              </>
            )}
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
      ) : !data ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-tal-line text-tal-plum-soft">
          No data
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <StatCard
              label="Active users (window)"
              value={data.activeUsers.windowTotal.toLocaleString()}
              hint={`of ${data.totalUsers} registered`}
            />
            <StatCard
              label="Total events"
              value={data.totalEvents.toLocaleString()}
              hint="server-tracked domain events"
            />
            <StatCard
              label="Device hits"
              value={totalDeviceHits.toLocaleString()}
              hint="page views by channel"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Onboarding funnel">
              <p className="text-xs text-tal-plum-soft mb-3">
                Distinct users who have reached each step at least once, ever.
                % is relative to users who signed up.
              </p>
              <ul className="space-y-2">
                {data.funnel.map((step) => (
                  <li key={step.step}>
                    <div className="flex items-baseline justify-between text-sm mb-1">
                      <span className="text-tal-plum">{step.label}</span>
                      <span className="text-tal-plum-soft">
                        {step.users.toLocaleString()} · {step.pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-tal-cream-soft overflow-hidden">
                      <div
                        className="h-full bg-tal-plum"
                        style={{ width: `${step.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Feature adoption (window)">
              <p className="text-xs text-tal-plum-soft mb-3">
                % of registered users who used each feature in the selected
                window.
              </p>
              <ul className="space-y-2">
                {data.adoption.map((f) => (
                  <li key={f.feature}>
                    <div className="flex items-baseline justify-between text-sm mb-1">
                      <span className="text-tal-plum">{f.label}</span>
                      <span className="text-tal-plum-soft">
                        {f.users.toLocaleString()} · {f.pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-tal-cream-soft overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${f.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Daily active users">
              <SparkBars
                data={data.activeUsers.daily.map((d) => ({
                  key: d.date,
                  value: d.users,
                }))}
                emptyMessage="Nothing logged yet."
              />
            </Card>
            <Card title="Weekly active users">
              <SparkBars
                data={data.activeUsers.weekly.map((w) => ({
                  key: w.weekStart,
                  value: w.users,
                }))}
                emptyMessage="Nothing logged yet."
              />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Device / channel">
              {totalDeviceHits === 0 ? (
                <div className="text-sm text-tal-plum-soft">No hits yet.</div>
              ) : (
                <div className="flex items-center gap-5 flex-wrap sm:flex-nowrap">
                  <PieChart
                    slices={data.devices.map((d) => ({
                      key: d.device,
                      label: d.device,
                      value: d.hits,
                      color: DEVICE_COLORS[d.device] ?? "#9ca3af",
                    }))}
                  />
                  <ul className="flex-1 min-w-0 space-y-1.5 text-sm">
                    {data.devices.map((d) => {
                      const pct =
                        totalDeviceHits > 0
                          ? Math.round((d.hits / totalDeviceHits) * 100)
                          : 0;
                      return (
                        <li
                          key={d.device}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-tal-plum flex items-center gap-2 min-w-0">
                            <span
                              className="inline-block w-3 h-3 rounded-sm shrink-0"
                              style={{
                                backgroundColor: DEVICE_COLORS[d.device],
                              }}
                            />
                            <span className="truncate">{d.device}</span>
                          </span>
                          <span className="text-tal-plum-soft shrink-0 tabular-nums">
                            {d.hits.toLocaleString()} · {pct}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </Card>

            <Card title="Events in window">
              {data.eventCounts.length === 0 ? (
                <div className="text-sm text-tal-plum-soft">
                  No domain events logged yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-tal-plum-soft text-xs uppercase">
                      <th className="text-left py-1">Event</th>
                      <th className="text-right py-1">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.eventCounts.map((e) => (
                      <tr key={e.action} className="border-t border-tal-line/60">
                        <td className="py-1 text-tal-plum font-mono text-xs">
                          {e.action}
                        </td>
                        <td className="py-1 text-right text-tal-plum-soft">
                          {e.hits.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          <Card title="Top pages (window)">
            {data.pageHits.length === 0 ? (
              <div className="text-sm text-tal-plum-soft">
                No page views yet.
              </div>
            ) : (
              <div className="space-y-4">
                <PageHitsPie pageHits={data.pageHits} />
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-tal-plum-soft text-xs uppercase">
                      <th className="text-left py-1">Page</th>
                      <th className="text-right py-1">Hits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pageHits.map((p) => (
                      <tr key={p.page} className="border-t border-tal-line/60">
                        <td className="py-1 text-tal-plum truncate max-w-xs">
                          {p.page}
                        </td>
                        <td className="py-1 text-right text-tal-plum-soft">
                          {p.hits.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <p className="text-[11px] text-tal-plum-soft leading-snug">
            Privacy: analytics only stores what page you visited (URL path)
            and what type of action you took (e.g. &ldquo;record.created&rdquo;) —
            never the contents of records, documents, notes, form answers,
            emergency details, or AI prompts.
          </p>
        </div>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-tal-line bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-tal-plum-soft">
        {label}
      </div>
      <div className="font-display text-2xl text-tal-plum mt-1">{value}</div>
      {hint && (
        <div className="text-xs text-tal-plum-soft mt-1">{hint}</div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-tal-line bg-white p-4">
      <h3 className="font-display text-lg text-tal-plum mb-3">{title}</h3>
      {children}
    </div>
  );
}

function SparkBars({
  data,
  emptyMessage,
}: {
  data: { key: string; value: number }[];
  emptyMessage: string;
}) {
  if (data.length === 0) {
    return <div className="text-sm text-tal-plum-soft">{emptyMessage}</div>;
  }
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-1 h-24">
        {data.map((d) => {
          const h = max > 0 ? Math.max(2, (d.value / max) * 96) : 2;
          return (
            <div
              key={d.key}
              className="flex-1 bg-tal-plum rounded-t-sm"
              style={{ height: `${h}px` }}
              title={`${d.key}: ${d.value}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-tal-plum-soft mt-1">
        <span>{data[0].key}</span>
        {data.length > 1 && <span>{data[data.length - 1].key}</span>}
      </div>
    </div>
  );
}

// Palette used for slices when no per-slice colour is provided (e.g. page hits).
const DONUT_PALETTE = [
  "#7c3aed", // plum
  "#0891b2", // cyan
  "#f59e0b", // amber
  "#16a34a", // green
  "#dc2626", // red
  "#2563eb", // blue
  "#db2777", // pink
  "#9ca3af", // grey (for "Other")
];

interface PieSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

// Hand-rolled SVG pie chart. Each slice is a filled path built with the SVG
// arc command — no chart library, no external deps.
function PieChart({ slices, size = 140 }: { slices: PieSlice[]; size?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const radius = 50;
  const cx = 50;
  const cy = 50;

  if (total === 0) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label="Pie chart (empty)"
      >
        <circle cx={cx} cy={cy} r={radius} fill="#e5e7eb" />
      </svg>
    );
  }

  // A single-slice pie can't be drawn as an arc (start == end), so shortcut
  // to a full filled circle.
  const nonZero = slices.filter((s) => s.value > 0);
  if (nonZero.length === 1) {
    const s = nonZero[0];
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label="Pie chart"
      >
        <circle cx={cx} cy={cy} r={radius} fill={s.color}>
          <title>{`${s.label}: ${s.value.toLocaleString()} (100%)`}</title>
        </circle>
      </svg>
    );
  }

  let angle = -Math.PI / 2; // start at 12 o'clock
  const paths = nonZero.map((s) => {
    const frac = s.value / total;
    const sweep = frac * 2 * Math.PI;
    const x1 = cx + radius * Math.cos(angle);
    const y1 = cy + radius * Math.sin(angle);
    angle += sweep;
    const x2 = cx + radius * Math.cos(angle);
    const y2 = cy + radius * Math.sin(angle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return (
      <path key={s.key} d={d} fill={s.color}>
        <title>{`${s.label}: ${s.value.toLocaleString()} (${Math.round(frac * 100)}%)`}</title>
      </path>
    );
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Pie chart"
    >
      {paths}
    </svg>
  );
}

// Top-N + Other donut for the page-hits list. Long tails become one grey slice.
function PageHitsPie({
  pageHits,
  topN = 7,
}: {
  pageHits: { page: string; hits: number }[];
  topN?: number;
}) {
  const sorted = [...pageHits].sort((a, b) => b.hits - a.hits);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const restTotal = rest.reduce((s, p) => s + p.hits, 0);
  const slices: PieSlice[] = top.map((p, i) => ({
    key: p.page,
    label: p.page,
    value: p.hits,
    color: DONUT_PALETTE[i % DONUT_PALETTE.length],
  }));
  if (restTotal > 0) {
    slices.push({
      key: "__other__",
      label: `Other (${rest.length} page${rest.length === 1 ? "" : "s"})`,
      value: restTotal,
      color: "#9ca3af",
    });
  }
  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <div className="flex items-center gap-5 flex-wrap sm:flex-nowrap">
      <PieChart slices={slices} />
      <ul className="flex-1 min-w-0 space-y-1.5 text-sm">
        {slices.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li
              key={s.key}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-tal-plum flex items-center gap-2 min-w-0">
                <span
                  className="inline-block w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate">{s.label}</span>
              </span>
              <span className="text-tal-plum-soft shrink-0 tabular-nums">
                {s.value.toLocaleString()} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
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
