"use client";

import { useMemo, useState } from "react";
import type { InventoryRow } from "@/lib/services/scope-inventory";
import type { SubcategoryScope } from "@/lib/db/types";

const SCOPE_LABELS: Record<SubcategoryScope, string> = {
  user_list: "Configure users",
  family_singleton: "Singleton",
  family_list: "List",
  per_user: "Per user",
  per_user_list: "Per-user list",
};

const SCOPE_COLOURS: Record<SubcategoryScope, string> = {
  user_list: "bg-blue-100 text-blue-800 border-blue-200",
  family_singleton: "bg-purple-100 text-purple-800 border-purple-200",
  family_list: "bg-amber-100 text-amber-800 border-amber-200",
  per_user: "bg-teal-100 text-teal-800 border-teal-200",
  per_user_list: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const SCOPE_ORDER: SubcategoryScope[] = [
  "user_list",
  "family_singleton",
  "family_list",
  "per_user",
  "per_user_list",
];

export function ScopeInventoryTable({ rows }: { rows: InventoryRow[] }) {
  const [scope, setScope] = useState<SubcategoryScope | "all">("all");
  const [search, setSearch] = useState("");
  const [onlyMissingForms, setOnlyMissingForms] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (scope !== "all" && r.scope !== scope) return false;
      if (onlyMissingForms && r.hasForm) return false;
      if (q) {
        const hay =
          `${r.name} ${r.hint ?? ""} ${r.parentPath} ${r.subcategoryId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, scope, search, onlyMissingForms]);

  const totals = useMemo(() => {
    const t = { all: rows.length } as Record<string, number>;
    for (const s of SCOPE_ORDER) {
      t[s] = rows.filter((r) => r.scope === s).length;
    }
    t.missingForms = rows.filter((r) => !r.hasForm).length;
    return t;
  }, [rows]);

  return (
    <div>
      <h1 className="font-display text-3xl text-tal-plum mb-1">
        Scope inventory
      </h1>
      <p className="text-tal-plum-soft mb-6 text-sm">
        Every folder in Life Admin, tagged by scope. Use this to track which
        forms are built vs still to build.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <FilterChip
          active={scope === "all"}
          onClick={() => setScope("all")}
          label={`All (${totals.all})`}
        />
        {SCOPE_ORDER.map((s) => (
          <FilterChip
            key={s}
            active={scope === s}
            onClick={() => setScope(s)}
            label={`${SCOPE_LABELS[s]} (${totals[s]})`}
            colourClass={SCOPE_COLOURS[s]}
          />
        ))}
        <div className="ml-auto flex items-center gap-3">
          <label className="text-sm text-tal-plum-soft flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={onlyMissingForms}
              onChange={(e) => setOnlyMissingForms(e.target.checked)}
            />
            Only missing forms ({totals.missingForms})
          </label>
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-xl border border-tal-line px-3 bg-white text-sm w-48"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-tal-line bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-tal-cream-soft border-b border-tal-line text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Parent</th>
                <th className="px-4 py-3 font-medium">Folder</th>
                <th className="px-4 py-3 font-medium">Scope</th>
                <th className="px-4 py-3 font-medium text-center">Form</th>
                <th className="px-4 py-3 font-medium text-right">Required Q's</th>
                <th className="px-4 py-3 font-medium text-right">Total Q's</th>
                <th className="px-4 py-3 font-medium text-tal-plum-soft">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tal-line">
              {filtered.map((r) => (
                <tr key={r.subcategoryId} className="hover:bg-tal-cream-soft">
                  <td className="px-4 py-2 text-tal-plum-soft whitespace-nowrap">
                    {r.parentPath}
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-tal-plum">{r.name}</div>
                    {r.hint && (
                      <div className="text-xs italic text-tal-plum-soft">
                        {r.hint}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        "text-xs px-2 py-0.5 rounded-full border " +
                        SCOPE_COLOURS[r.scope]
                      }
                    >
                      {SCOPE_LABELS[r.scope]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {r.hasForm ? (
                      <span className="text-green-700" aria-label="Has form">
                        ✓
                      </span>
                    ) : (
                      <span className="text-tal-plum-soft" aria-label="No form">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-tal-plum">
                    {r.requiredCount || (r.hasForm ? 0 : "")}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-tal-plum-soft">
                    {r.totalQuestionCount || ""}
                  </td>
                  <td className="px-4 py-2 text-xs font-mono text-tal-plum-soft whitespace-nowrap">
                    {r.subcategoryId}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-tal-plum-soft"
                  >
                    Nothing matches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  colourClass,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  colourClass?: string;
}) {
  const base = "h-8 px-3 rounded-full border text-xs font-medium";
  const idle = colourClass ?? "bg-white text-tal-plum border-tal-line";
  const on = "bg-tal-plum text-white border-tal-plum";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${active ? on : idle}`}
    >
      {label}
    </button>
  );
}
