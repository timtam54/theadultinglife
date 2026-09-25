"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ItemKind } from "@/lib/db/item-access";

interface ShareableItem {
  key: string;
  groupLabel: string;
  itemLabel: string;
  subcategoryId: string | null;
  itemKind: ItemKind;
  itemId: string;
}

interface ItemResult {
  key: string;
  ok: boolean;
  error?: string;
}

export function ShareAllPlannerButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ShareableItem[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  );
  const [results, setResults] = useState<ItemResult[] | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFatalError(null);
    setResults(null);
    setProgress(null);
    fetch("/api/item-access/shareable")
      .then(async (r) => {
        if (!r.ok) throw new Error("load_failed");
        return (await r.json()) as { items: ShareableItem[] };
      })
      .then((body) => {
        setItems(body.items);
        setChecked(new Set(body.items.map((i) => i.key)));
      })
      .catch((e) =>
        setFatalError(e instanceof Error ? e.message : "load_failed")
      )
      .finally(() => setLoading(false));
  }, [open]);

  const grouped = useMemo(() => {
    const g = new Map<string, ShareableItem[]>();
    for (const i of items) {
      const arr = g.get(i.groupLabel) ?? [];
      arr.push(i);
      g.set(i.groupLabel, arr);
    }
    return Array.from(g.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const allChecked = items.length > 0 && checked.size === items.length;

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function checkAll() {
    setChecked(new Set(items.map((i) => i.key)));
  }
  function uncheckAll() {
    setChecked(new Set());
  }

  async function shareAll() {
    if (!email.trim()) return;
    const selected = items.filter((i) => checked.has(i.key));
    if (selected.length === 0) return;
    setSubmitting(true);
    setResults(null);
    setFatalError(null);
    const out: ItemResult[] = [];
    setProgress({ done: 0, total: selected.length });
    for (let i = 0; i < selected.length; i++) {
      const item = selected[i];
      try {
        const res = await fetch("/api/item-access", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            subcategoryId: item.subcategoryId,
            itemKind: item.itemKind,
            itemId: item.itemId,
            granteeEmail: email.trim().toLowerCase(),
            itemLabel: item.itemLabel,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          out.push({ key: item.key, ok: false, error: body.error ?? "failed" });
        } else {
          out.push({ key: item.key, ok: true });
        }
      } catch (e) {
        out.push({
          key: item.key,
          ok: false,
          error: e instanceof Error ? e.message : "network_error",
        });
      }
      setProgress({ done: i + 1, total: selected.length });
    }
    setResults(out);
    setSubmitting(false);
    router.refresh();
  }

  const succeeded = results?.filter((r) => r.ok).length ?? 0;
  const failed = results?.filter((r) => !r.ok) ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 px-3 rounded-xl bg-black text-white text-sm font-medium"
      >
        Share all with…
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
          onClick={submitting ? undefined : () => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col rounded-2xl bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 px-6 pt-6 pb-4 border-b border-tal-line">
              <h3 className="font-display text-lg text-tal-plum">
                Share Planner items with someone
              </h3>
              <p className="text-sm text-tal-plum-soft mt-1">
                Pick the items to share. The recipient must already have an
                Adulting Life account (their email).
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading && (
                <p className="text-sm text-tal-plum-soft">Loading…</p>
              )}
              {fatalError && !loading && (
                <p className="text-sm text-red-700">
                  Couldn&apos;t load your items ({fatalError}).
                </p>
              )}
              {!loading && !fatalError && items.length === 0 && (
                <p className="text-sm text-tal-plum-soft">
                  Nothing here yet — fill in some Planner sections first, then
                  come back to share.
                </p>
              )}

              {!loading && items.length > 0 && (
                <>
                  <div className="mb-3 flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={checkAll}
                      disabled={allChecked}
                      className="h-8 px-3 rounded-lg border border-tal-line text-tal-plum hover:bg-tal-cream-soft disabled:opacity-40"
                    >
                      Check all
                    </button>
                    <button
                      type="button"
                      onClick={uncheckAll}
                      disabled={checked.size === 0}
                      className="h-8 px-3 rounded-lg border border-tal-line text-tal-plum hover:bg-tal-cream-soft disabled:opacity-40"
                    >
                      Uncheck all
                    </button>
                    <span className="ml-auto text-xs text-tal-plum-soft">
                      {checked.size} of {items.length} selected
                    </span>
                  </div>

                  <div className="space-y-4">
                    {grouped.map(([label, list]) => (
                      <div key={label}>
                        <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft font-semibold mb-1.5">
                          {label}
                        </div>
                        <ul className="space-y-1">
                          {list.map((item) => {
                            const r = results?.find((x) => x.key === item.key);
                            return (
                              <li
                                key={item.key}
                                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-tal-cream-soft"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked.has(item.key)}
                                  onChange={() => toggle(item.key)}
                                  disabled={submitting}
                                  className="shrink-0"
                                />
                                <span className="flex-1 text-sm text-tal-plum">
                                  {item.itemLabel}
                                </span>
                                {r?.ok && (
                                  <span className="text-[10px] uppercase tracking-widest text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    Shared
                                  </span>
                                )}
                                {r?.ok === false && (
                                  <span
                                    className="text-[10px] uppercase tracking-widest text-red-700 bg-red-50 px-1.5 py-0.5 rounded"
                                    title={r.error}
                                  >
                                    Failed
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {results && (
                <div className="mt-4 p-3 rounded-lg bg-tal-cream-soft text-sm text-tal-plum">
                  Shared {succeeded} of {results.length}.
                  {failed.length > 0 && (
                    <>
                      {" "}
                      {failed.length} failed
                      {failed.some((r) => r.error === "grantee_not_found") &&
                        " (recipient not found — check their email)"}
                      {failed.some((r) => r.error === "cannot_share_with_self") &&
                        " (can't share with your own account)"}
                      .
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-tal-line flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Recipient email"
                disabled={submitting}
                className="flex-1 h-10 rounded-xl border border-tal-line px-3 bg-white text-sm"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="h-10 px-3 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft disabled:opacity-60"
              >
                {results ? "Close" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={shareAll}
                disabled={
                  submitting ||
                  loading ||
                  !email.trim() ||
                  checked.size === 0
                }
                className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
              >
                {submitting
                  ? `Sharing ${progress?.done ?? 0} / ${progress?.total ?? 0}…`
                  : `Share ${checked.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
