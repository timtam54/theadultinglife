"use client";

import type { CategoryId } from "@/lib/db/types";

export interface FolderPickerOption {
  id: string;
  name: string;
  categoryId: CategoryId;
  thumbnailUrl: string;
}

export interface FolderPickerGroup {
  id: CategoryId;
  label: string;
  folders: FolderPickerOption[];
}

interface Props {
  groups: FolderPickerGroup[];
  disabled?: boolean;
  onPick: (folder: FolderPickerOption) => void;
  emptyLabel?: string;
}

export function FolderPickerGrid({
  groups,
  disabled = false,
  onPick,
  emptyLabel = "You don't have any folders yet.",
}: Props) {
  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-tal-line bg-white p-6 text-sm text-tal-plum-soft">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.id}>
          <h2 className="font-display text-lg text-tal-plum mb-2">{g.label}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onPick(f)}
                disabled={disabled}
                className="group flex items-center gap-3 rounded-xl border border-tal-line bg-white p-3 text-left hover:shadow-sm hover:border-tal-plum/40 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.thumbnailUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="shrink-0 w-10 h-10 rounded-lg object-cover bg-tal-cream-soft"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-tal-plum truncate">
                    {f.name}
                  </div>
                </div>
                <span
                  className="text-tal-plum-soft/60 group-hover:text-tal-plum shrink-0"
                  aria-hidden
                >
                  →
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
