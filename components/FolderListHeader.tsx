"use client";

import { GuardedLink as Link } from "@/components/GuardedLink";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CategoryId } from "@/lib/db/types";

export function FolderListHeader({
  title,
  subtitle,
  category,
  view,
  subcategoryId,
  thumbnailUrl,
}: {
  title: string;
  subtitle?: string;
  category: CategoryId;
  view: "list" | "grid" | "matrix";
  subcategoryId?: string;
  thumbnailUrl: string;
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
    // Always append ?view= — matrix is the default now, so a bare URL would
    // resolve back to matrix even when the user clicks List.
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt=""
            width={36}
            height={36}
            className="w-9 h-9 rounded-xl object-cover shrink-0"
          />
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
            {title}
          </span>
          <h1 className="font-display text-2xl leading-tight">
            {subtitle ?? title}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <div
              role="tablist"
              aria-label="View style"
              className="inline-flex items-center gap-1 rounded-full bg-white/10 p-1 border-2 border-white/60 shadow-inner text-xs"
            >
              {(["list", "grid", "matrix"] as const).map((v) => {
                const active = view === v;
                const label = v === "list" ? "List" : v === "grid" ? "Grid" : "Matrix";
                const icon =
                  v === "list" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  ) : v === "grid" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M8 4v16M14 4v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  );
                return (
                  <Link
                    key={v}
                    href={toggleHref(v)}
                    role="tab"
                    aria-selected={active}
                    className={
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-full font-medium transition-all " +
                      (active
                        ? "bg-white text-black shadow-sm scale-105"
                        : "text-white/85 hover:bg-white/20 hover:text-white hover:scale-105")
                    }
                  >
                    {icon}
                    {label}
                  </Link>
                );
              })}
            </div>
            <a
              href={`/records/${category}/pdf`}
              target="_blank"
              rel="noopener"
              aria-label="Print or save this whole section as a PDF"
              className="h-8 w-8 rounded-xl bg-white/10 text-white hover:bg-white/20 hover:scale-110 transition-transform inline-flex items-center justify-center"
              title="Print or save this whole section as a PDF"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M7 9V3h10v6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <rect
                  x="4"
                  y="9"
                  width="16"
                  height="9"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <rect
                  x="7"
                  y="14"
                  width="10"
                  height="7"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <circle cx="17" cy="12" r="0.9" fill="currentColor" />
              </svg>
            </a>
            <button
              type="button"
              onClick={() => setShowNewFolder((v) => !v)}
              className="h-8 px-3 rounded-xl bg-white text-black text-xs font-medium hover:bg-white/90 inline-flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              New Folder
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
            className="h-9 px-3 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50"
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
