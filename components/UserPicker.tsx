"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { MemberKind } from "@/lib/db/types";

export interface PickerUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  member_kind: MemberKind;
  is_primary: boolean;
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
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-3 rounded-xl border border-tal-line bg-white text-sm text-tal-plum hover:bg-tal-cream-soft flex items-center gap-1.5"
      >
        <span className="font-medium">{displayName(current)}</span>
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
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-tal-line bg-white shadow-lg z-20 overflow-hidden">
          <ul className="py-1">
            {users.map((u) => {
              const active = u.id === current.id;
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => select(u.id)}
                    className={
                      "w-full text-left px-3 py-2 text-sm hover:bg-tal-cream-soft flex items-center justify-between gap-3 " +
                      (active ? "bg-tal-cream-soft" : "")
                    }
                  >
                    <div className="min-w-0">
                      <div className="text-tal-plum truncate font-medium">
                        {displayName(u)}
                      </div>
                      <div className="text-xs text-tal-plum-soft">
                        {u.member_kind}
                        {u.is_primary ? " · primary" : ""}
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
