"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface UserMenuProps {
  firstName: string | null;
  avatarUrl: string | null;
  isSuper: boolean;
  reminderCount?: number;
}

const SUPER_ITEMS: { href: string; label: string }[] = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/logs", label: "Error logs" },
  { href: "/admin/ai", label: "AI" },
  { href: "/admin/scope-inventory", label: "Scope inventory" },
  { href: "/admin/videos", label: "Videos" },
];

export function UserMenu({
  firstName,
  avatarUrl,
  isSuper,
  reminderCount = 0,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (firstName ?? "?").charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
    <div className="flex items-center gap-4">
      <Link
        href="/reminders"
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-tal-cream text-tal-plum transition-colors"
        aria-label={`Reminders${reminderCount > 0 ? ` (${reminderCount})` : ""}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 9a6 6 0 0 1 12 0v5l1.5 2.5H4.5L6 14V9Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M10 19a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        {reminderCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {reminderCount > 9 ? "9+" : reminderCount}
          </span>
        )}
      </Link>

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex items-center gap-2 py-1 pl-1 pr-2 rounded-full hover:bg-tal-cream transition-colors"
        >
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={avatarUrl}
              alt=""
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <span className="w-9 h-9 rounded-full bg-tal-plum text-white text-sm font-semibold flex items-center justify-center">
              {initial}
            </span>
          )}
          <span className="text-sm text-tal-plum">
            Hi {firstName ?? "there"}
          </span>
          <span
            className={
              "text-tal-plum-soft text-xs transition-transform " +
              (open ? "rotate-180" : "")
            }
            aria-hidden
          >
            ▾
          </span>
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 min-w-48 rounded-xl border border-tal-line bg-white shadow-lg py-2 z-30"
          >
            {isSuper && (
              <>
                <div className="px-4 py-1 text-[10px] uppercase tracking-widest text-tal-plum-soft">
                  Super
                </div>
                {SUPER_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2 text-sm text-tal-plum hover:bg-tal-cream-soft"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="my-1 border-t border-tal-line" />
              </>
            )}
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                role="menuitem"
                className="w-full text-left px-4 py-2 text-sm text-tal-plum hover:bg-tal-cream-soft"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
