"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

interface AvailableSubcategory {
  id: string;
  name: string;
  categoryLabel: string;
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "form"
  );
}

export function NewFolderFormPicker({
  available,
}: {
  available: AvailableSubcategory[];
}) {
  const router = useRouter();
  const [subcategoryId, setSubcategoryId] = useState("");
  const [pageGroup, setPageGroup] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const suggestedGroup = useMemo(() => {
    const sub = available.find((s) => s.id === subcategoryId);
    return sub ? slugify(sub.name) : "";
  }, [available, subcategoryId]);

  const effectiveGroup = pageGroup.trim() || suggestedGroup;

  function submit() {
    setError(null);
    if (!subcategoryId) {
      setError("Pick a folder first.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/folder-forms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subcategoryId, pageGroup: effectiveGroup }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.message ?? body?.error ?? "Failed to create form.");
        return;
      }
      router.push(body.editorHref);
    });
  }

  if (available.length === 0) {
    return (
      <p className="text-sm text-tal-plum-soft">
        Every catalogue folder already has a form.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm text-tal-plum-soft">Folder</span>
        <select
          value={subcategoryId}
          onChange={(e) => setSubcategoryId(e.target.value)}
          className="mt-1 w-full h-10 rounded-lg border border-tal-line px-3 bg-white text-sm"
        >
          <option value="">Choose a folder…</option>
          {available.map((s) => (
            <option key={s.id} value={s.id}>
              {s.categoryLabel} — {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm text-tal-plum-soft">
          Page group{" "}
          <span className="text-tal-plum-soft/70 text-xs">
            (used as the ID prefix for fields)
          </span>
        </span>
        <input
          value={pageGroup}
          onChange={(e) => setPageGroup(e.target.value)}
          placeholder={suggestedGroup || "tax_file_number"}
          className="mt-1 w-full h-10 rounded-lg border border-tal-line px-3 text-sm font-mono"
        />
      </label>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || !subcategoryId}
        className="h-10 px-4 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Creating…" : "Continue to editor"}
      </button>
    </div>
  );
}
