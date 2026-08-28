"use client";

import { useEffect, useState } from "react";
import type { ItemAccessGrantRow, ItemKind } from "@/lib/db/item-access";

interface Props {
  subcategoryId: string | null;
  itemKind: ItemKind;
  itemId: string;
  itemLabel: string;
  onClose: () => void;
}

interface Grantee {
  grantId: number;
  granteeEmail: string;
  granteeName: string;
}

// Grants come back from the API with just user_ids. We fetch a lightweight
// {id, email, name} map for each grantee for display.
interface GranteeLookupRow {
  id: string;
  email: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
}

export function ShareDialog({
  subcategoryId,
  itemKind,
  itemId,
  itemLabel,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [grantees, setGrantees] = useState<Grantee[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          itemKind,
          itemId,
        });
        if (subcategoryId) params.set("subcategoryId", subcategoryId);
        const res = await fetch(`/api/item-access?${params.toString()}`);
        if (!res.ok) throw new Error("load_failed");
        const data = (await res.json()) as { grants: ItemAccessGrantRow[] };
        // Look up grantee display info in one call.
        const ids = data.grants.map((g) => g.grantee_user_id);
        let lookup = new Map<string, GranteeLookupRow>();
        if (ids.length > 0) {
          const uRes = await fetch(
            `/api/users/lookup?ids=${encodeURIComponent(ids.join(","))}`
          );
          if (uRes.ok) {
            const uData = (await uRes.json()) as {
              users: GranteeLookupRow[];
            };
            lookup = new Map(uData.users.map((u) => [u.id, u]));
          }
        }
        if (cancelled) return;
        setGrantees(
          data.grants.map((g) => {
            const u = lookup.get(g.grantee_user_id);
            return {
              grantId: g.id,
              granteeEmail: u?.email ?? "",
              granteeName:
                [u?.first_name, u?.last_name].filter(Boolean).join(" ") ||
                u?.name ||
                u?.email ||
                "",
            };
          })
        );
      } catch {
        if (!cancelled) setError("Couldn't load who has access.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subcategoryId, itemKind, itemId]);

  async function add() {
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/item-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subcategoryId,
          itemKind,
          itemId,
          granteeEmail: clean,
          itemLabel,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        grant?: ItemAccessGrantRow;
        error?: string;
      };
      if (!res.ok) {
        if (data.error === "grantee_not_found") {
          setError(
            `No Adulting Life user with email "${clean}". They need to sign up first.`
          );
        } else if (data.error === "cannot_share_with_self") {
          setError("You can't share with yourself.");
        } else {
          setError(data.error ?? "Couldn't share.");
        }
        return;
      }
      const grant = data.grant;
      if (grant) {
        setGrantees((prev) => [
          ...prev.filter((g) => g.grantId !== grant.id),
          {
            grantId: grant.id,
            granteeEmail: clean,
            granteeName: clean,
          },
        ]);
        setEmail("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(grantId: number) {
    if (!confirm("Remove their access?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/item-access/${grantId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete_failed");
      setGrantees((prev) => prev.filter((g) => g.grantId !== grantId));
    } catch {
      setError("Couldn't remove access.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dialog-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-tal-line">
          <h3
            id="share-dialog-title"
            className="font-display text-lg text-tal-plum"
          >
            Share {itemLabel}
          </h3>
          <p className="text-xs text-tal-plum-soft mt-1">
            Anyone you share with will see this in their Peace of Mind Planner.
            They&apos;ll get an email letting them know.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {loading ? (
            <p className="text-sm text-tal-plum-soft">Loading…</p>
          ) : grantees.length === 0 ? (
            <p className="text-sm text-tal-plum-soft italic">
              Not shared with anyone yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {grantees.map((g) => (
                <li
                  key={g.grantId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-tal-line px-3 py-2 bg-tal-cream-soft/40"
                >
                  <div className="min-w-0 text-sm">
                    <div className="text-tal-plum truncate">{g.granteeName}</div>
                    {g.granteeName !== g.granteeEmail && (
                      <div className="text-xs text-tal-plum-soft truncate">
                        {g.granteeEmail}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(g.grantId)}
                    disabled={busy}
                    className="text-xs text-red-700 hover:underline disabled:opacity-60"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="pt-3 border-t border-tal-line">
            <label className="block text-xs uppercase tracking-widest text-tal-plum-soft mb-1">
              Share with (email)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void add();
                  }
                }}
                placeholder="name@example.com"
                className="flex-1 h-10 rounded-xl border border-tal-line px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tal-plum/40"
              />
              <button
                type="button"
                onClick={add}
                disabled={busy || !email.trim()}
                className="h-10 px-4 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-60"
              >
                {busy ? "…" : "Share"}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-tal-line flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl text-sm text-tal-plum hover:bg-tal-cream-soft"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
