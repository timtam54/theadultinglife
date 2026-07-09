"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function SuperMenu() {
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="hover:text-tal-plum inline-flex items-center gap-1"
      >
        Super
        <span aria-hidden className="text-xs">
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 min-w-40 rounded-xl border border-tal-line bg-white shadow-md py-1 z-20"
        >
          <Link
            href="/admin/users"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 hover:bg-tal-cream-soft text-tal-plum"
          >
            Users
          </Link>
          <Link
            href="/admin/audit"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 hover:bg-tal-cream-soft text-tal-plum"
          >
            Audit
          </Link>
          <Link
            href="/admin/ai"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 hover:bg-tal-cream-soft text-tal-plum"
          >
            AI
          </Link>
        </div>
      )}
    </div>
  );
}
