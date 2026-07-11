"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CategoryId } from "@/lib/db/types";

export function FolderListHeader({
  title,
  subtitle,
  category,
  view,
  subcategoryId,
}: {
  title: string;
  subtitle?: string;
  category: CategoryId;
  view: "list" | "grid" | "matrix";
  subcategoryId?: string;
}) {
  const router = useRouter();
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleHref = (v: "list" | "grid" | "matrix") => {
    const base = subcategoryId
      ? `/records/${category}/${encodeURIComponent(subcategoryId)}`
      : `/records/${category}`;
    if (v === "list") return base;
    return `${base}?view=${v}`;
  };

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const res = await fetch("/api/records/folders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId: category, name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to create folder");
      }
      setName("");
      setShowNewFolder(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl text-tal-plum leading-tight">
            {title}
          </h1>
          {subtitle && (
            <div className="text-sm text-tal-plum-soft mt-0.5">{subtitle}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-tal-line bg-white overflow-hidden text-sm">
            <Link
              href={toggleHref("list")}
              className={`px-3 py-1.5 ${
                view === "list"
                  ? "bg-tal-plum text-white"
                  : "text-tal-plum-soft hover:bg-tal-cream-soft"
              }`}
            >
              List
            </Link>
            <Link
              href={toggleHref("grid")}
              className={`px-3 py-1.5 ${
                view === "grid"
                  ? "bg-tal-plum text-white"
                  : "text-tal-plum-soft hover:bg-tal-cream-soft"
              }`}
            >
              Grid
            </Link>
            <Link
              href={toggleHref("matrix")}
              className={`px-3 py-1.5 ${
                view === "matrix"
                  ? "bg-tal-plum text-white"
                  : "text-tal-plum-soft hover:bg-tal-cream-soft"
              }`}
            >
              Matrix
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setShowNewFolder((v) => !v)}
            className="h-9 px-3 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark"
          >
            + New Folder
          </button>
        </div>
      </div>

      {showNewFolder && (
        <form
          onSubmit={createFolder}
          className="mt-4 flex items-center gap-2 rounded-xl border border-tal-line bg-white p-3"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            className="flex-1 rounded-lg border border-tal-line px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="h-9 px-3 rounded-xl bg-tal-plum text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowNewFolder(false);
              setName("");
              setErr(null);
            }}
            className="h-9 px-3 rounded-xl border border-tal-line text-sm text-tal-plum-soft"
          >
            Cancel
          </button>
          {err && (
            <span className="text-xs text-red-600 ml-2">{err}</span>
          )}
        </form>
      )}
    </div>
  );
}
