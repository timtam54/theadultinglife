"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition, useEffect } from "react";

export function FolderSearchBar({
  tags,
  activeTag,
  activeSearch,
}: {
  tags: string[];
  activeTag: string;
  activeSearch: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [value, setValue] = useState(activeSearch);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setValue(activeSearch);
  }, [activeSearch]);

  function pushWith(patch: Record<string, string | null>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  function commit(q: string) {
    pushWith({ q: q || null });
  }

  const hasFilter = Boolean(activeTag) || Boolean(activeSearch);

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-tal-plum-soft"
            aria-hidden
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" />
              <path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(value);
              }
            }}
            onBlur={() => value !== activeSearch && commit(value)}
            placeholder="Search this folder…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-tal-line bg-white text-sm focus:outline-none focus:border-tal-plum"
          />
        </div>
        {hasFilter && (
          <button
            type="button"
            onClick={() => pushWith({ q: null, tag: null })}
            className="h-9 px-3 rounded-lg border border-tal-line text-xs text-tal-plum-soft hover:bg-tal-cream-soft"
          >
            Clear filters
          </button>
        )}
      </div>
      {tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-tal-plum-soft">Tags:</span>
          {tags.map((t) => {
            const active = t === activeTag;
            return (
              <button
                key={t}
                type="button"
                onClick={() => pushWith({ tag: active ? null : t })}
                className={
                  "text-xs px-2.5 py-1 rounded-full transition " +
                  (active
                    ? "bg-violet-600 text-white"
                    : "bg-violet-50 text-violet-800 hover:bg-violet-100")
                }
              >
                {t}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
