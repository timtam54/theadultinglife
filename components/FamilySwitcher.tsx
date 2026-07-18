"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PickerUser } from "./UserPicker";

function displayName(u: PickerUser): string {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.email || "Unnamed";
}

function initial(u: PickerUser): string {
  const n = displayName(u);
  return (n[0] || "?").toUpperCase();
}

export function FamilySwitcher({
  users,
  activeUserId,
}: {
  users: PickerUser[];
  activeUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const current = users.find((u) => u.id === activeUserId) ?? users[0];

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!current || users.length <= 1) return null;

  async function select(userId: string) {
    setOpen(false);
    await fetch("/api/family/active-user", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Viewing as ${displayName(current)}. Change person.`}
        className="inline-flex items-center gap-2 h-9 pl-2 pr-3 rounded-full border border-tal-line bg-white hover:border-tal-plum hover:shadow-sm transition text-sm"
      >
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-tal-plum text-white text-xs font-semibold">
          {initial(current)}
        </span>
        <span className="hidden sm:inline text-tal-plum-soft">Viewing:</span>
        <span className="font-medium text-tal-plum">{displayName(current)}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-tal-line bg-white shadow-lg z-30 overflow-hidden">
          <div className="px-3 py-2 border-b border-tal-line text-[10px] uppercase tracking-widest text-tal-plum-soft">
            Family
          </div>
          <ul className="py-1" role="listbox">
            {users.map((u) => {
              const active = u.id === current.id;
              return (
                <li key={u.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => select(u.id)}
                    className={
                      "w-full text-left px-3 py-2 text-sm hover:bg-tal-cream-soft flex items-center gap-3 " +
                      (active ? "bg-tal-cream-soft" : "")
                    }
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-tal-plum text-white text-xs font-semibold shrink-0">
                      {initial(u)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-tal-plum truncate font-medium">
                        {displayName(u)}
                      </div>
                      <div className="text-xs text-tal-plum-soft">
                        {u.member_kind}
                        {u.is_primary ? " · primary" : ""}
                      </div>
                    </div>
                    {active && (
                      <span className="text-tal-plum shrink-0" aria-hidden>
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
