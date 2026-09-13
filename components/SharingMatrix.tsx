"use client";

/*
 * Owner's audit view of every share they've issued. Items down the rows,
 * people across the columns, one cell per (item, person).
 *
 * A cell shows either:
 *   ✓ view   — grant exists. Click to revoke (with confirm).
 *   —        — no grant. Click to add.
 *
 * The item label links through to the underlying folder/planner page so the
 * owner can jump to the item's own Share dialog for anything the matrix
 * can't do (e.g. sharing with a NEW person who doesn't appear as a column
 * yet — use the Add person control at the top).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  SharingMatrix as MatrixData,
  SharingMatrixItem,
  SharingMatrixPerson,
} from "@/lib/services/sharing-matrix";

interface Props {
  data: MatrixData;
}

type CellMap = Map<string, number>; // `${itemKey}|${personId}` -> grantId

function buildCellMap(data: MatrixData): CellMap {
  const m = new Map<string, number>();
  for (const c of data.cells) {
    m.set(`${c.itemKey}|${c.personId}`, c.grantId);
  }
  return m;
}

export function SharingMatrix({ data }: Props) {
  const router = useRouter();
  const [busy, startBusy] = useTransition();
  const [cellMap, setCellMap] = useState<CellMap>(() => buildCellMap(data));
  const [confirm, setConfirm] = useState<{
    item: SharingMatrixItem;
    person: SharingMatrixPerson;
    grantId: number;
  } | null>(null);
  const [addTo, setAddTo] = useState<{
    item: SharingMatrixItem;
    person: SharingMatrixPerson;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (data.items.length === 0) {
    return (
      <div className="rounded-2xl border border-tal-line bg-white p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-tal-cream-soft flex items-center justify-center mb-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 3v18M3 12h18"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="font-display text-tal-plum text-lg">
          Nothing shared yet
        </div>
        <p className="text-sm text-tal-plum-soft mt-1">
          Open any folder and tap Share to give a family member access to
          specific items. Anything you share will appear here.
        </p>
      </div>
    );
  }

  async function revoke() {
    if (!confirm) return;
    setError(null);
    startBusy(async () => {
      const res = await fetch(`/api/item-access/${confirm!.grantId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Couldn't revoke — please try again.");
        return;
      }
      const next = new Map(cellMap);
      next.delete(`${confirm!.item.key}|${confirm!.person.userId}`);
      setCellMap(next);
      setConfirm(null);
      router.refresh();
    });
  }

  async function addGrant() {
    if (!addTo) return;
    setError(null);
    startBusy(async () => {
      const res = await fetch("/api/item-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subcategoryId: addTo!.item.subcategoryId,
          itemKind: addTo!.item.itemKind,
          itemId: addTo!.item.itemId,
          granteeEmail: addTo!.person.email,
          itemLabel: addTo!.item.itemLabel,
        }),
      });
      if (!res.ok) {
        setError("Couldn't grant access — please try again.");
        return;
      }
      const { grant } = (await res.json()) as { grant: { id: number } };
      const next = new Map(cellMap);
      next.set(`${addTo!.item.key}|${addTo!.person.userId}`, grant.id);
      setCellMap(next);
      setAddTo(null);
      router.refresh();
    });
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-tal-line bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-tal-cream-soft">
              <th
                scope="col"
                className="text-left font-medium text-tal-plum px-4 py-3 sticky left-0 bg-tal-cream-soft z-10"
              >
                Shared item
              </th>
              {data.people.map((p) => (
                <th
                  key={p.userId}
                  scope="col"
                  className="text-center font-medium text-tal-plum px-3 py-3 whitespace-nowrap"
                >
                  <div className="leading-tight">{p.name}</div>
                  <div className="text-[10px] text-tal-plum-soft font-normal truncate max-w-[160px]">
                    {p.email}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr
                key={item.key}
                className="border-t border-tal-line/60 hover:bg-tal-cream-soft/40"
              >
                <th
                  scope="row"
                  className="text-left font-normal px-4 py-2.5 sticky left-0 bg-white z-10 align-top"
                >
                  <ItemLabel item={item} />
                </th>
                {data.people.map((person) => {
                  const grantId = cellMap.get(`${item.key}|${person.userId}`);
                  return (
                    <td
                      key={person.userId}
                      className="text-center px-2 py-2.5 align-middle"
                    >
                      {grantId ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setConfirm({ item, person, grantId })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 disabled:opacity-50"
                          aria-label={`${person.name} has view access to ${item.itemLabel}. Click to revoke.`}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden
                          >
                            <path
                              d="M5 12l5 5 9-11"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          view
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setAddTo({ item, person })}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-tal-plum-soft/50 hover:text-tal-plum hover:bg-tal-cream-soft text-lg disabled:opacity-50"
                          aria-label={`Grant ${person.name} access to ${item.itemLabel}`}
                        >
                          —
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-tal-plum-soft">
        Click <span className="text-emerald-700 font-medium">view</span> to
        revoke. Click <span className="font-medium">—</span> to add access.
        To share with someone new who isn&apos;t listed above yet, open the
        item and use its Share button.
      </p>

      {confirm && (
        <Modal onClose={() => setConfirm(null)}>
          <h3 className="font-display text-lg text-tal-plum">Revoke access?</h3>
          <p className="text-sm text-tal-plum-soft mt-1">
            <span className="font-medium text-tal-plum">
              {confirm.person.name}
            </span>{" "}
            will lose access to{" "}
            <span className="font-medium text-tal-plum">
              {confirm.item.itemLabel}
            </span>
            . You can grant access again any time.
          </p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirm(null)}
              disabled={busy}
              className="h-9 px-3 rounded-lg border border-tal-line text-sm text-tal-plum"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={revoke}
              disabled={busy}
              className="h-9 px-4 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-60"
            >
              {busy ? "Revoking…" : "Yes, revoke"}
            </button>
          </div>
        </Modal>
      )}

      {addTo && (
        <Modal onClose={() => setAddTo(null)}>
          <h3 className="font-display text-lg text-tal-plum">Grant access?</h3>
          <p className="text-sm text-tal-plum-soft mt-1">
            <span className="font-medium text-tal-plum">
              {addTo.person.name}
            </span>{" "}
            will be able to view{" "}
            <span className="font-medium text-tal-plum">
              {addTo.item.itemLabel}
            </span>{" "}
            in their Planner. They&apos;ll get an email letting them know.
          </p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddTo(null)}
              disabled={busy}
              className="h-9 px-3 rounded-lg border border-tal-line text-sm text-tal-plum"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addGrant}
              disabled={busy}
              className="h-9 px-4 rounded-lg bg-tal-plum text-white text-sm font-medium disabled:opacity-60"
            >
              {busy ? "Granting…" : "Yes, grant access"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ItemLabel({ item }: { item: SharingMatrixItem }) {
  // Best-effort deep link back to the item's own page. For folder-scoped
  // items we can link to the folder; for planner items we link to the
  // Planner section. If we don't know a href we just render text.
  const href = hrefForItem(item);
  const label = (
    <>
      <div className="text-tal-plum leading-tight">{item.itemLabel}</div>
      {item.subcategoryLabel && (
        <div className="text-[11px] text-tal-plum-soft">
          {item.subcategoryLabel}
        </div>
      )}
    </>
  );
  if (!href) return <div>{label}</div>;
  return (
    <Link
      href={href}
      className="hover:underline underline-offset-2"
      title="Open this item"
    >
      {label}
    </Link>
  );
}

function hrefForItem(item: SharingMatrixItem): string | null {
  if (
    item.itemKind === "planner_letter" ||
    item.itemKind === "planner_apology" ||
    item.itemKind === "planner_wish" ||
    item.itemKind === "planner_last_words"
  ) {
    return "/templates/peace-of-mind-planner";
  }
  if (item.subcategoryId && item.categoryId) {
    return `/records/${item.categoryId}/${item.subcategoryId}`;
  }
  return null;
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-5">
        {children}
      </div>
    </div>
  );
}
