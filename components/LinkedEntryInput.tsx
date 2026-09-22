"use client";

import { useEffect, useState } from "react";

interface Props {
  value: string;
  onChange: (instanceId: string) => void;
  linkedSubcategoryId: string;
  linkedLabelFields: string[];
  targetUserId?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

// Dropdown whose options come from another folder's repeater entries.
// Fetches via /api/linked-entries/[subcategoryId] on mount. The selected
// value is the source entry's instance_id — stable across renames of the
// display fields.
export function LinkedEntryInput({
  value,
  onChange,
  linkedSubcategoryId,
  linkedLabelFields,
  targetUserId,
  ariaLabel,
  disabled,
}: Props) {
  const [entries, setEntries] = useState<{ instance_id: string; label: string }[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!linkedSubcategoryId) return;
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({
          labelFields: linkedLabelFields.join(","),
        });
        if (targetUserId) qs.set("targetUserId", targetUserId);
        const res = await fetch(
          `/api/linked-entries/${encodeURIComponent(linkedSubcategoryId)}?${qs.toString()}`
        );
        if (!res.ok) throw new Error("load_failed");
        const body = (await res.json()) as {
          entries: { instance_id: string; label: string }[];
        };
        if (!cancelled) setEntries(body.entries);
      } catch {
        if (!cancelled) setError("Couldn't load options.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkedSubcategoryId, linkedLabelFields, targetUserId]);

  const empty = entries !== null && entries.length === 0;

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        disabled={disabled || entries === null}
        className="w-full h-11 rounded-xl border border-tal-line px-3 text-sm bg-white disabled:opacity-60"
      >
        <option value="">
          {entries === null ? "Loading…" : empty ? "No entries to pick from" : "—"}
        </option>
        {entries?.map((e) => (
          <option key={e.instance_id} value={e.instance_id}>
            {e.label}
          </option>
        ))}
      </select>
      {error && (
        <div className="mt-1 text-xs text-red-700">{error}</div>
      )}
    </div>
  );
}
