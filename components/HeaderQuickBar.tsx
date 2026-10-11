"use client";

import { GuardedLink as Link } from "@/components/GuardedLink";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ADD_ACTIONS = [
  { href: "/records/new", label: "Add record" },
  { href: "/records/upload", label: "Upload document" },
  { href: "/records/scan", label: "Scan document" },
  { href: "/reminders/new", label: "Add reminder" },
];

/*
 * Left side of the app header: organiser search plus a quick "+ Add" menu.
 * Hidden below md, where the header only has room for the logo and the
 * account controls — it still renders as the flex spacer there.
 */
export function HeaderQuickBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/records/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="flex-1 min-w-0 flex items-center gap-2">
      <form
        onSubmit={onSubmit}
        role="search"
        className="hidden md:block relative w-full max-w-sm"
      >
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
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your organiser…"
          aria-label="Search your organiser"
          className="w-full h-10 pl-9 pr-3 rounded-full border border-tal-line bg-white text-sm text-tal-plum focus:outline-none focus:border-tal-plum"
        />
      </form>

      <div ref={ref} className="hidden md:block relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-tal-line bg-white text-sm font-medium text-tal-plum hover:bg-tal-cream transition-colors whitespace-nowrap"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add
        </button>
        {open && (
          <div
            role="menu"
            className="absolute left-0 top-full mt-2 min-w-48 rounded-xl border border-tal-line bg-white shadow-lg py-2 z-30"
          >
            {ADD_ACTIONS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-tal-plum hover:bg-tal-cream-soft"
              >
                {a.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
