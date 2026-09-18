"use client";

import { useEffect, useState } from "react";
import { ShareDialog } from "./ShareDialog";
import type { ItemKind } from "@/lib/db/item-access";
import { isPlannerSharedSubcategory } from "@/lib/templates/peace-of-mind-v2";

interface Props {
  subcategoryId: string | null;
  itemKind: ItemKind;
  itemId: string;
  itemLabel: string;
  /** Kept for backwards compatibility; ignored — always icon-only now. */
  variant?: "chip" | "icon";
  className?: string;
}

// Item kinds that live only in the Planner (letters, apologies, wishes, last
// words). These have no subcategory_id and are always shareable — the Planner
// itself is their destination.
const PLANNER_ONLY_KINDS: ReadonlySet<ItemKind> = new Set([
  "planner_letter",
  "planner_apology",
  "planner_wish",
  "planner_last_words",
]);

/**
 * "Share…" button that opens a dialog listing current grantees + an "Add by
 * email" input. Shows a green dot + count when the item is already shared with
 * at least one grantee. Owner-only surface — do not render for grantees.
 *
 * Renders nothing when the item's Organiser folder has no Planner section:
 * without a Planner destination the grantee has nowhere to view what was
 * shared, so we prevent the grant at the source. Planner-only item kinds
 * bypass this check.
 */
export function ShareButton({
  subcategoryId,
  itemKind,
  itemId,
  itemLabel,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [shareCount, setShareCount] = useState<number | null>(null);

  const allowed =
    PLANNER_ONLY_KINDS.has(itemKind) || isPlannerSharedSubcategory(subcategoryId);

  async function refreshCount() {
    try {
      const params = new URLSearchParams({ itemKind, itemId });
      if (subcategoryId) params.set("subcategoryId", subcategoryId);
      const res = await fetch(`/api/item-access?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as { grants: unknown[] };
      setShareCount(data.grants.length);
    } catch {
      /* leave count null on error */
    }
  }

  useEffect(() => {
    if (!allowed) return;
    void refreshCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subcategoryId, itemKind, itemId, allowed]);

  if (!allowed) return null;

  const shared = (shareCount ?? 0) > 0;

  return (
    <>
      <button
        type="button"
        data-tour="share-button"
        onClick={() => setOpen(true)}
        className={
          "relative " +
          (className ??
            "inline-flex items-center justify-center h-9 w-9 rounded-lg border text-tal-plum hover:bg-tal-cream-soft " +
              (shared
                ? "border-emerald-500 bg-emerald-50"
                : "border-tal-line bg-white"))
        }
        aria-label={
          shared
            ? `Nominated to ${shareCount} ${shareCount === 1 ? "person" : "people"} — click to manage`
            : "Nominate a trusted person"
        }
        title={
          shared
            ? `Nominated to ${shareCount} ${shareCount === 1 ? "person" : "people"} — click to manage`
            : "Nominate a trusted person to receive this document"
        }
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M8 11l8-4M8 13l8 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        {shared && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white"
          />
        )}
      </button>
      {open && (
        <ShareDialog
          subcategoryId={subcategoryId}
          itemKind={itemKind}
          itemId={itemId}
          itemLabel={itemLabel}
          onClose={() => {
            setOpen(false);
            void refreshCount();
          }}
        />
      )}
    </>
  );
}
