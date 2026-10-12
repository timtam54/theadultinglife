"use client";

import { GuardedLink as Link } from "@/components/GuardedLink";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShareDialog } from "@/components/ShareDialog";
import type { ShareableItem } from "@/lib/services/planner-shareable";

interface FolderGrant {
  grantId: number;
  itemKey: string;
  granteeUserId: string;
  granteeName: string;
  granteeEmail: string;
}

interface Props {
  subcategoryId: string;
  folderName: string;
  folderHref: string;
  /** Distinct people the signed-in user has shared anything in this folder with. */
  count: number;
}

/*
 * Share icon + people count for one folder row of the category matrix.
 * Green when the folder is shared with at least one person, red when it's
 * shared with nobody. Clicking opens a dialog listing who has access and
 * letting the owner nominate more people, entry by entry.
 */
export function FolderShareButton({
  subcategoryId,
  folderName,
  folderHref,
  count,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const shared = count > 0;
  const label = shared
    ? `${folderName} is shared with ${count} ${count === 1 ? "person" : "people"} — click to manage`
    : `${folderName} isn't shared with anyone — click to nominate someone`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={label}
        aria-label={label}
        className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-1 text-tal-plum hover:bg-tal-cream-soft transition-colors"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        <span
          className={
            "min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold inline-flex items-center justify-center " +
            (shared
              ? "bg-emerald-100 text-emerald-800"
              : "bg-red-100 text-red-700")
          }
        >
          {count}
        </span>
      </button>
      {open && (
        <FolderShareDialog
          subcategoryId={subcategoryId}
          folderName={folderName}
          folderHref={folderHref}
          onClose={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "loaded"; items: ShareableItem[]; grants: FolderGrant[] };

function FolderShareDialog({
  subcategoryId,
  folderName,
  folderHref,
  onClose,
}: {
  subcategoryId: string;
  folderName: string;
  folderHref: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [sharing, setSharing] = useState<ShareableItem | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/item-access/folder?subcategoryId=${encodeURIComponent(subcategoryId)}`
        );
        if (!res.ok) throw new Error("load_failed");
        const data = (await res.json()) as {
          items: ShareableItem[];
          grants: FolderGrant[];
        };
        if (!cancelled)
          setState({ kind: "loaded", items: data.items, grants: data.grants });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subcategoryId, reloadKey]);

  // The per-entry dialog sits on top; when it closes, reload so the names
  // and counts here reflect any nomination that was added or withdrawn.
  if (sharing) {
    return (
      <ShareDialog
        subcategoryId={sharing.subcategoryId}
        itemKind={sharing.itemKind}
        itemId={sharing.itemId}
        itemLabel={sharing.itemLabel}
        onClose={() => {
          setSharing(null);
          setState({ kind: "loading" });
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  const people =
    state.kind === "loaded"
      ? Array.from(
          state.grants
            .reduce((acc, g) => {
              const entry = acc.get(g.granteeUserId) ?? {
                name: g.granteeName || g.granteeEmail,
                email: g.granteeEmail,
                itemKeys: [] as string[],
              };
              entry.itemKeys.push(g.itemKey);
              acc.set(g.granteeUserId, entry);
              return acc;
            }, new Map<string, { name: string; email: string; itemKeys: string[] }>())
            .entries()
        )
      : [];
  const labelByKey =
    state.kind === "loaded"
      ? new Map(state.items.map((i) => [i.key, i.itemLabel]))
      : new Map<string, string>();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-share-dialog-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 text-left"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[85vh] rounded-2xl bg-white shadow-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-tal-line">
          <h3
            id="folder-share-dialog-title"
            className="font-display text-lg text-tal-plum"
          >
            Sharing — {folderName}
          </h3>
          <p className="text-xs text-tal-plum-soft mt-1">
            Who can see what you&apos;ve added to this folder. Shared entries
            appear in their Peace of Mind Planner.
          </p>
        </div>

        <div className="px-5 py-4 space-y-5 overflow-y-auto">
          {state.kind === "loading" && (
            <p className="text-sm text-tal-plum-soft">Loading…</p>
          )}
          {state.kind === "error" && (
            <p className="text-sm text-red-700">
              Couldn&apos;t load who has access.
            </p>
          )}
          {state.kind === "loaded" && (
            <>
              <section>
                <div className="text-xs uppercase tracking-widest text-tal-plum-soft mb-2">
                  Shared with
                </div>
                {people.length === 0 ? (
                  <p className="text-sm text-tal-plum-soft italic">
                    Not shared with anyone yet.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {people.map(([userId, p]) => (
                      <li
                        key={userId}
                        className="rounded-lg border border-tal-line px-3 py-2 bg-tal-cream-soft/40 text-sm"
                      >
                        <div className="text-tal-plum truncate">{p.name}</div>
                        {p.email && p.email !== p.name && (
                          <div className="text-xs text-tal-plum-soft truncate">
                            {p.email}
                          </div>
                        )}
                        <div className="text-xs text-tal-plum-soft mt-1">
                          {p.itemKeys
                            .map((k) => labelByKey.get(k) ?? "An entry")
                            .join(", ")}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <div className="text-xs uppercase tracking-widest text-tal-plum-soft mb-2">
                  Your entries
                </div>
                {state.items.length === 0 ? (
                  <p className="text-sm text-tal-plum-soft">
                    You haven&apos;t added anything to this folder yet, so
                    there&apos;s nothing to share.{" "}
                    <Link href={folderHref} className="text-tal-plum underline">
                      Open the folder
                    </Link>{" "}
                    to add an entry first.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {state.items.map((item) => {
                      const n = state.grants.filter(
                        (g) => g.itemKey === item.key
                      ).length;
                      return (
                        <li
                          key={item.key}
                          className="flex items-center justify-between gap-3 rounded-lg border border-tal-line px-3 py-2"
                        >
                          <div className="min-w-0 text-sm">
                            <div className="text-tal-plum truncate">
                              {item.itemLabel}
                            </div>
                            <div className="text-xs text-tal-plum-soft">
                              {n === 0
                                ? "Not shared"
                                : `Shared with ${n} ${n === 1 ? "person" : "people"}`}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSharing(item)}
                            className="shrink-0 h-9 px-3 rounded-xl bg-black text-white text-sm font-medium"
                          >
                            {n === 0 ? "Share" : "Manage"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-tal-line flex justify-end">
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
