"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { MemberKind } from "@/lib/db/types";

export type PickerUserStatus = "complete" | "started" | "empty";

export interface PickerUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  member_kind: MemberKind;
  is_primary: boolean;
  status?: PickerUserStatus;
}

function statusBg(s: PickerUserStatus | undefined, active: boolean): string {
  if (s === "complete") return active ? "bg-emerald-100" : "bg-emerald-50 hover:bg-emerald-100";
  if (s === "started") return active ? "bg-amber-100" : "bg-amber-50 hover:bg-amber-100";
  return active ? "bg-tal-cream-soft" : "hover:bg-tal-cream-soft";
}

function statusLabel(s: PickerUserStatus | undefined): string | null {
  if (s === "complete") return "Complete";
  if (s === "started") return "Started";
  return null;
}

function displayName(u: PickerUser): string {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.email || "Unnamed";
}

export function UserPicker({
  users,
  currentUserId,
}: {
  users: PickerUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onEsc);
      return () => {
        document.removeEventListener("mousedown", onClick);
        document.removeEventListener("keydown", onEsc);
      };
    }
  }, [open]);

  const current = users.find((u) => u.id === currentUserId) ?? users[0];

  function select(userId: string) {
    setOpen(false);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("user", userId);
    router.push(`${pathname}?${sp.toString()}`);
  }

  if (!current || users.length <= 1) return null;

  return (
    <div ref={rootRef} className="relative inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Viewing as ${displayName(current)}. Click to switch to another family member.`}
        title="Click to switch to another family member"
        className="no-hover-fx group inline-flex items-center gap-2 h-9 pl-2 pr-3 rounded-full border-2 border-tal-plum/40 bg-white text-tal-plum text-sm font-semibold shadow-sm transition-all hover:border-tal-plum hover:bg-tal-plum hover:text-white hover:shadow-md hover:-translate-y-0.5 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-tal-plum/40"
      >
        <span
          aria-hidden
          className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-tal-plum/10 text-tal-plum transition-colors group-hover:bg-white/20 group-hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 11l-3 3-2-2" />
          </svg>
        </span>
        <span>{displayName(current)}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="transition-transform group-hover:translate-y-0.5"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <span className="hidden sm:inline text-xs text-tal-plum-soft italic">
        click to switch person
      </span>
      {open && (
        <div className="absolute left-0 mt-2 w-64 rounded-xl border border-tal-line bg-white shadow-lg z-20 overflow-hidden">
          <ul className="py-1" role="listbox">
            {users.map((u) => {
              const active = u.id === current.id;
              const label = statusLabel(u.status);
              return (
                <li key={u.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => select(u.id)}
                    className={
                      "w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-3 " +
                      statusBg(u.status, active)
                    }
                  >
                    <div className="min-w-0">
                      <div className="text-tal-plum truncate font-medium">
                        {displayName(u)}
                      </div>
                      <div className="text-xs text-tal-plum-soft">
                        {u.member_kind}
                        {u.is_primary ? " · primary" : ""}
                        {label ? ` · ${label}` : ""}
                      </div>
                    </div>
                    {active && (
                      <span className="text-tal-plum" aria-hidden>
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
