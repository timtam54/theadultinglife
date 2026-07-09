"use client";

import { useMemo, useState } from "react";
import type { AuditRow } from "@/lib/db/types";

function fmt(dt: string): string {
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function isIP(s: string): boolean {
  return (
    /^(\d{1,3}\.){3}\d{1,3}$/.test(s) ||
    /^([\da-f]{1,4}:){7}[\da-f]{1,4}$|^::1$|^::$/i.test(s)
  );
}

interface Summary {
  username: string;
  hitCount: number;
  lastAccess: string;
  mostVisitedPage: string;
  mostUsedPlatform: string;
  isAnon: boolean;
}

function buildSummaries(rows: AuditRow[]): Summary[] {
  const map = new Map<
    string,
    {
      hitCount: number;
      lastAccess: string;
      pageCounts: Map<string, number>;
      actionCounts: Map<string, number>;
    }
  >();

  for (const r of rows) {
    const cur = map.get(r.username) ?? {
      hitCount: 0,
      lastAccess: r.created_at,
      pageCounts: new Map<string, number>(),
      actionCounts: new Map<string, number>(),
    };
    cur.hitCount += 1;
    if (r.created_at > cur.lastAccess) cur.lastAccess = r.created_at;
    cur.pageCounts.set(r.page, (cur.pageCounts.get(r.page) ?? 0) + 1);
    cur.actionCounts.set(r.action, (cur.actionCounts.get(r.action) ?? 0) + 1);
    map.set(r.username, cur);
  }

  const summaries: Summary[] = [];
  for (const [username, v] of map) {
    let topPage = "";
    let topPageN = 0;
    for (const [p, n] of v.pageCounts)
      if (n > topPageN) {
        topPageN = n;
        topPage = p;
      }
    let topAction = "";
    let topActionN = 0;
    for (const [a, n] of v.actionCounts)
      if (n > topActionN) {
        topActionN = n;
        topAction = a;
      }
    summaries.push({
      username,
      hitCount: v.hitCount,
      lastAccess: v.lastAccess,
      mostVisitedPage: topPage,
      mostUsedPlatform: topAction,
      isAnon: isIP(username),
    });
  }
  summaries.sort((a, b) => b.hitCount - a.hitCount);
  return summaries;
}

// Colour cards by the first alpha char of the page. Matches the vibe of
// incidentaccident's getPageColor without pulling in Tailwind config changes.
function pageCardStyle(page: string): {
  border: string;
  gradientFrom: string;
  gradientTo: string;
  chip: string;
} {
  const c = (page.replace(/^\//, "").charAt(0) || "z").toLowerCase();
  const map: Record<
    string,
    { border: string; gradientFrom: string; gradientTo: string; chip: string }
  > = {
    a: { border: "#bfdbfe", gradientFrom: "#eff6ff", gradientTo: "#dbeafe", chip: "#1e40af" },
    b: { border: "#a7f3d0", gradientFrom: "#ecfdf5", gradientTo: "#d1fae5", chip: "#065f46" },
    c: { border: "#ddd6fe", gradientFrom: "#f5f3ff", gradientTo: "#ede9fe", chip: "#5b21b6" },
    d: { border: "#fde68a", gradientFrom: "#fffbeb", gradientTo: "#fef3c7", chip: "#92400e" },
    e: { border: "#fbcfe8", gradientFrom: "#fdf2f8", gradientTo: "#fce7f3", chip: "#9d174d" },
    f: { border: "#c7d2fe", gradientFrom: "#eef2ff", gradientTo: "#e0e7ff", chip: "#3730a3" },
    g: { border: "#99f6e4", gradientFrom: "#f0fdfa", gradientTo: "#ccfbf1", chip: "#115e59" },
    h: { border: "#fecdd3", gradientFrom: "#fff1f2", gradientTo: "#ffe4e6", chip: "#9f1239" },
    i: { border: "#a5f3fc", gradientFrom: "#ecfeff", gradientTo: "#cffafe", chip: "#155e75" },
    l: { border: "#d9f99d", gradientFrom: "#f7fee7", gradientTo: "#ecfccb", chip: "#3f6212" },
    r: { border: "#bae6fd", gradientFrom: "#f0f9ff", gradientTo: "#e0f2fe", chip: "#075985" },
    s: { border: "#fecaca", gradientFrom: "#fef2f2", gradientTo: "#fee2e2", chip: "#991b1b" },
  };
  return (
    map[c] ?? {
      border: "#e6dcd0",
      gradientFrom: "#fff5e6",
      gradientTo: "#ffe7ce",
      chip: "#4c373c",
    }
  );
}

function buildDailyHits(rows: AuditRow[]): { date: string; hits: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([date, hits]) => ({ date, hits }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

function DailyChart({ data }: { data: { date: string; hits: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-tal-plum-soft">
        No activity yet.
      </div>
    );
  }

  const width = 900;
  const height = 320;
  const padL = 44;
  const padR = 16;
  const padT = 20;
  const padB = 44;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const max = Math.max(...data.map((d) => d.hits), 1);
  const yTicks = 4;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const points = data.map((d, i) => {
    const x = padL + i * stepX;
    const y = padT + innerH - (d.hits / max) * innerH;
    return { x, y, ...d };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${path} L${points[points.length - 1].x},${padT + innerH} L${points[0].x},${padT + innerH} Z`
      : "";

  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((max * i) / yTicks)
  );

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-w-[600px]"
      >
        {yTickVals.map((v) => {
          const y = padT + innerH - (v / max) * innerH;
          return (
            <g key={v}>
              <line
                x1={padL}
                x2={padL + innerW}
                y1={y}
                y2={y}
                stroke="#e6dcd0"
                strokeDasharray="4 4"
              />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#8a7178"
              >
                {v}
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="#4c373c" fillOpacity="0.08" />
        <path d={path} stroke="#4c373c" strokeWidth={2.5} fill="none" />
        {points.map((p) => (
          <circle key={p.date} cx={p.x} cy={p.y} r={3.5} fill="#4c373c" />
        ))}
        {points.map((p, i) => {
          const showEvery = Math.max(1, Math.ceil(points.length / 12));
          if (i % showEvery !== 0 && i !== points.length - 1) return null;
          const [, mm, dd] = p.date.split("-");
          return (
            <text
              key={`lbl-${p.date}`}
              x={p.x}
              y={padT + innerH + 18}
              textAnchor="middle"
              fontSize="11"
              fill="#8a7178"
            >
              {dd}/{mm}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function AuditView({ audits }: { audits: AuditRow[] }) {
  const [view, setView] = useState<"summary" | "cards" | "chart">("summary");
  const summaries = useMemo(() => buildSummaries(audits), [audits]);
  const daily = useMemo(() => buildDailyHits(audits), [audits]);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6 gap-4 flex-wrap">
        <h1 className="font-display text-3xl text-tal-plum">Audit log</h1>
        <div className="inline-flex rounded-xl border border-tal-line bg-white p-1">
          {(["summary", "cards", "chart"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 h-8 rounded-lg text-sm capitalize ${
                view === v
                  ? "bg-tal-plum text-white"
                  : "text-tal-plum hover:bg-tal-cream-soft"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "summary" && (
        <div className="rounded-2xl border border-tal-line bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-tal-cream-soft border-b border-tal-line text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Rank</th>
                  <th className="px-4 py-3 font-medium">Hits</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Top page</th>
                  <th className="px-4 py-3 font-medium">Platform</th>
                  <th className="px-4 py-3 font-medium">Last access</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s, i) => (
                  <tr
                    key={s.username}
                    className="border-b border-tal-line last:border-0"
                  >
                    <td className="px-4 py-3">
                      {i === 0
                        ? "🥇"
                        : i === 1
                          ? "🥈"
                          : i === 2
                            ? "🥉"
                            : `#${i + 1}`}
                    </td>
                    <td className="px-4 py-3 font-semibold text-tal-plum">
                      {s.hitCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-tal-plum text-white flex items-center justify-center text-xs font-semibold">
                          {s.username.charAt(0).toUpperCase()}
                        </div>
                        <span
                          className={
                            s.isAnon
                              ? "text-tal-plum-soft italic"
                              : "text-tal-plum"
                          }
                        >
                          {s.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-tal-cream text-tal-plum">
                        {s.mostVisitedPage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-tal-plum-soft">
                      {s.mostUsedPlatform}
                    </td>
                    <td className="px-4 py-3 text-tal-plum-soft">
                      {fmt(s.lastAccess)}
                    </td>
                  </tr>
                ))}
                {summaries.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-tal-plum-soft"
                    >
                      No activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "cards" && (
        <>
          {audits.length === 0 ? (
            <div className="rounded-2xl border border-tal-line bg-white p-12 text-center text-tal-plum-soft">
              No activity yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {audits.map((r) => {
                const style = pageCardStyle(r.page);
                const anon = isIP(r.username);
                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border p-4 transition hover:shadow-md"
                    style={{
                      borderColor: style.border,
                      background: `linear-gradient(135deg, ${style.gradientFrom} 0%, ${style.gradientTo} 100%)`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-white/70"
                        style={{ color: style.chip }}
                      >
                        {r.page}
                      </span>
                      <span className="text-xs text-gray-500">{r.action}</span>
                    </div>
                    <div
                      className={`text-sm font-medium truncate mb-1 ${
                        anon ? "italic text-gray-600" : "text-gray-900"
                      }`}
                      title={r.username}
                    >
                      {r.username}
                    </div>
                    <div className="text-xs text-gray-500">
                      {fmt(r.created_at)}
                    </div>
                    {r.ip_address && !anon && (
                      <div className="text-xs text-gray-500 mt-1">
                        IP {r.ip_address}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === "chart" && (
        <div className="rounded-2xl border border-tal-line bg-white p-4">
          <h2 className="font-display text-tal-plum mb-4">Daily activity</h2>
          <DailyChart data={daily} />
        </div>
      )}
    </div>
  );
}
