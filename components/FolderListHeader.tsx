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
      <div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
        <Link
          href="/records"
          className="text-tal-plum-soft hover:text-tal-plum transition-colors"
        >
          {title}
        </Link>
        {subtitle && (
          <>
            <span className="text-tal-plum-soft/50" aria-hidden>/</span>
            <span className="text-tal-plum-soft">{subtitle}</span>
          </>
        )}
      </div>

      <div className="rounded-2xl bg-black text-white px-6 py-4 mb-4 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
            {title}
          </span>
          <h1 className="font-display text-2xl leading-tight">
            {subtitle ?? title}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-white/10 overflow-hidden text-xs">
              <Link
                href={toggleHref("list")}
                className={
                  "px-3 py-1.5 transition " +
                  (view === "list"
                    ? "bg-white text-black font-medium"
                    : "text-white/80 hover:bg-white/10")
                }
              >
                List
              </Link>
              <Link
                href={toggleHref("grid")}
                className={
                  "px-3 py-1.5 transition " +
                  (view === "grid"
                    ? "bg-white text-black font-medium"
                    : "text-white/80 hover:bg-white/10")
                }
              >
                Grid
              </Link>
              <Link
                href={toggleHref("matrix")}
                className={
                  "px-3 py-1.5 transition " +
                  (view === "matrix"
                    ? "bg-white text-black font-medium"
                    : "text-white/80 hover:bg-white/10")
                }
              >
                Matrix
              </Link>
            </div>
            <a
              href={`/records/${category}/pdf`}
              target="_blank"
              rel="noopener"
              className="h-8 px-3 rounded-xl bg-white/10 text-white text-xs font-medium hover:bg-white/20 inline-flex items-center gap-1"
              title="Print or save this whole section as a PDF"
            >
              Print section
            </a>
            <button
              type="button"
              onClick={() => setShowNewFolder((v) => !v)}
              className="h-8 px-3 rounded-xl bg-white text-black text-xs font-medium hover:bg-white/90"
            >
              + New Folder
            </button>
          </div>
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
