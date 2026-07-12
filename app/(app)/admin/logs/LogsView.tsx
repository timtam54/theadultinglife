"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AppLogRow } from "@/lib/db/types";

function fmt(dt: string): string {
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export function LogsView({
  logs,
  initialLevel,
  initialSource,
}: {
  logs: AppLogRow[];
  initialLevel?: string;
  initialSource?: string;
}) {
  const router = useRouter();
  const [level, setLevel] = useState(initialLevel ?? "");
  const [source, setSource] = useState(initialSource ?? "");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function apply() {
    const sp = new URLSearchParams();
    if (level) sp.set("level", level);
    if (source) sp.set("source", source);
    router.push(`/admin/logs${sp.toString() ? "?" + sp.toString() : ""}`);
  }

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-tal-plum mb-2">Error logs</h1>
      <p className="text-tal-plum-soft mb-6">
        Server-side errors and warnings. Newest first. Showing up to 500.
      </p>

      <div className="mb-6 flex flex-wrap gap-3 items-end">
        <label className="flex flex-col text-xs uppercase tracking-wider text-tal-plum-soft">
          Level
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="mt-1 h-9 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
          >
            <option value="">All</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
          </select>
        </label>
        <label className="flex flex-col text-xs uppercase tracking-wider text-tal-plum-soft">
          Source contains
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. records, scan-document"
            className="mt-1 h-9 rounded-xl border border-tal-line bg-white px-3 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={apply}
          className="h-9 px-4 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark"
        >
          Apply
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="text-tal-plum-soft">No matching log entries.</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => {
            const isOpen = expanded.has(log.id);
            const badgeCls =
              log.level === "error"
                ? "bg-red-100 text-red-800 border-red-200"
                : "bg-amber-100 text-amber-800 border-amber-200";
            return (
              <li
                key={log.id}
                className="rounded-xl border border-tal-line bg-white overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(log.id)}
                  className="w-full text-left px-4 py-3 hover:bg-tal-cream-soft flex items-start gap-3"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${badgeCls}`}
                  >
                    {log.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-tal-plum font-medium truncate">
                      {log.message}
                    </div>
                    <div className="text-xs text-tal-plum-soft mt-0.5">
                      <span className="font-mono">{log.source}</span>
                      {" · "}
                      <span>{fmt(log.created_at)}</span>
                      {log.request_id && (
                        <>
                          {" · "}
                          <span className="font-mono">{log.request_id}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-tal-line px-4 py-3 bg-tal-cream-soft/50 text-xs">
                    {log.user_id && (
                      <div className="mb-2">
                        <span className="text-tal-plum-soft">User: </span>
                        <span className="font-mono">{log.user_id}</span>
                      </div>
                    )}
                    {log.family_group_id && (
                      <div className="mb-2">
                        <span className="text-tal-plum-soft">Family: </span>
                        <span className="font-mono">{log.family_group_id}</span>
                      </div>
                    )}
                    {log.metadata && (
                      <div className="mb-2">
                        <div className="text-tal-plum-soft mb-1">Metadata:</div>
                        <pre className="font-mono whitespace-pre-wrap bg-white border border-tal-line rounded-lg p-2 overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.stack && (
                      <div>
                        <div className="text-tal-plum-soft mb-1">Stack:</div>
                        <pre className="font-mono whitespace-pre-wrap bg-white border border-tal-line rounded-lg p-2 overflow-x-auto text-[11px]">
                          {log.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
