"use client";

import { useState } from "react";
import { RecordEditor } from "@/components/RecordEditor";
import { ShareButton } from "@/components/ShareButton";
import type { CategoryId, RecordField, RecordRow } from "@/lib/db/types";

// Shared list + inline editor for records-mode subcategories. Renders a list
// of the caller's records for the given subcategory; clicking one opens the
// full RecordEditor inline; Add opens a blank RecordEditor inline. On save
// or delete, the editor closes and the list refreshes — no page navigation.
// Used inside the Planner section pages so users never leave the Planner.

interface Props {
  categoryId: CategoryId;
  subcategoryId: string;
  defaultFields: RecordField[];
  initialRecords: RecordRow[];
  suggestedTags: string[];
  isAdmin: boolean;
}

export function SubcategoryRecordsList({
  categoryId,
  subcategoryId,
  defaultFields,
  initialRecords,
  suggestedTags,
  isAdmin,
}: Props) {
  const [mode, setMode] = useState<
    { kind: "list" } | { kind: "add" } | { kind: "edit"; record: RecordRow }
  >({ kind: "list" });

  function openAdd() {
    setMode({ kind: "add" });
  }

  function openEdit(record: RecordRow) {
    setMode({ kind: "edit", record });
  }

  function backToList() {
    setMode({ kind: "list" });
  }

  if (mode.kind === "add") {
    const emptyFields: RecordField[] = defaultFields.length
      ? defaultFields.map((f) => ({
          key: f.key,
          label: f.label,
          type: f.type,
          value: "",
        }))
      : [];
    return (
      <div>
        <button
          type="button"
          onClick={backToList}
          className="text-sm text-tal-plum-soft hover:text-tal-plum mb-3"
        >
          ← Back to list
        </button>
        <div className="rounded-2xl border border-tal-line bg-white p-4">
          <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft mb-3 font-medium">
            New entry
          </div>
          <RecordEditor
            categoryId={categoryId}
            subcategoryId={subcategoryId}
            mode="create"
            enableScan
            suggestedTags={suggestedTags}
            isAdmin={isAdmin}
            initial={
              emptyFields.length
                ? {
                    title: "",
                    fields: emptyFields,
                    expiryDate: null,
                    notes: null,
                    subcategoryId,
                    tags: [],
                  }
                : undefined
            }
            onSaved={backToList}
            onCancel={backToList}
          />
        </div>
      </div>
    );
  }

  if (mode.kind === "edit") {
    return (
      <div>
        <button
          type="button"
          onClick={backToList}
          className="text-sm text-tal-plum-soft hover:text-tal-plum mb-3"
        >
          ← Back to list
        </button>
        <div className="rounded-2xl border border-tal-line bg-white p-4">
          <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft mb-3 font-medium">
            Edit entry
          </div>
          <RecordEditor
            categoryId={categoryId}
            mode="edit"
            recordId={mode.record.id}
            suggestedTags={suggestedTags}
            isAdmin={isAdmin}
            initial={{
              title: mode.record.title,
              expiryDate: mode.record.expiry_date,
              notes: mode.record.notes,
              subcategoryId: mode.record.subcategory_id,
              tags: mode.record.tags ?? [],
            }}
            onSaved={backToList}
            onDeleted={backToList}
            onCancel={backToList}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="text-sm text-tal-plum-soft">
          {initialRecords.length}{" "}
          {initialRecords.length === 1 ? "entry" : "entries"}
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/85"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Add
        </button>
      </div>

      {initialRecords.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-6 text-sm text-tal-plum-soft">
          Nothing here yet. Click Add to create your first entry.
        </div>
      ) : (
        <ul className="space-y-2">
          {initialRecords.map((r) => {
            const summary = "";
            return (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-xl border border-tal-line bg-white px-4 py-3 hover:shadow-sm hover:bg-tal-cream-soft/40 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  className="flex-1 min-w-0 text-left flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-tal-plum break-all">
                      {r.title || "Untitled"}
                    </div>
                    {summary && summary !== r.title && (
                      <div className="text-xs text-tal-plum-soft mt-0.5 truncate">
                        {summary}
                      </div>
                    )}
                  </div>
                  <span className="text-tal-plum-soft shrink-0" aria-hidden>
                    ›
                  </span>
                </button>
                <ShareButton
                  subcategoryId={subcategoryId}
                  itemKind="record"
                  itemId={r.id}
                  itemLabel={r.title || "Untitled"}
                  variant="icon"
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
