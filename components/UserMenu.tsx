"use client";

import { GuardedLink as Link } from "@/components/GuardedLink";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";

interface UserMenuProps {
  firstName: string | null;
  email: string | null;
  avatarUrl: string | null;
  isSuper: boolean;
  reminderCount?: number;
  subscriptionStatus?: string;
}

const SUPER_ITEMS: { href: string; label: string }[] = [
  { href: "/admin/family-groups", label: "Family groups" },
  { href: "/admin/users", label: "All users (flat)" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/logs", label: "Error logs" },
  { href: "/admin/ai", label: "AI" },
  { href: "/admin/privacy-requests", label: "Privacy requests" },
  { href: "/admin/data-breach-procedure", label: "Data breach procedure" },
  { href: "/admin/scope-inventory", label: "Scope inventory" },
  { href: "/admin/videos", label: "Videos" },
  { href: "/admin/folder-forms", label: "Folder forms" },
];

export function UserMenu({
  firstName,
  email,
  avatarUrl,
  isSuper,
  reminderCount = 0,
  subscriptionStatus = "none",
}: UserMenuProps) {
  // Any live-ish subscription status = Premium for display purposes. Matches
  // SubscribePrompt's hide list so the header and the nag popup agree.
  const isPremium = [
    "active",
    "pending",
    "canceled",
    "paused",
    "delinquent",
  ].includes(subscriptionStatus);
  const [open, setOpen] = useState(false);
  const [startingTour, setStartingTour] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  // Manual tour trigger: clears the completed flag + demo-seeded flag,
  // then navigates to /dashboard?tour=start so TourLauncher picks it up
  // via the URL param without waiting for a page reload.
  async function takeTour() {
    if (startingTour) return;
    setStartingTour(true);
    try {
      await fetch("/api/tour/reset", { method: "POST" });
    } catch {
      /* non-fatal — the ?tour=start param still launches the tour */
    }
    setOpen(false);
    router.push("/dashboard?tour=start");
  }

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
    <div className="flex items-center gap-1 sm:gap-4">
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
          title={email ? `Signed in as ${email}` : undefined}
          className="flex items-center gap-2 py-1 pl-1 pr-2 rounded-full hover:bg-tal-cream transition-colors"
        >
          <Avatar
            avatarUrl={avatarUrl}
            firstName={firstName ?? "?"}
            sizeClass="w-9 h-9"
            initialTextClass="text-sm"
          />

          <span className="hidden sm:inline text-sm text-tal-plum">
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
            className="absolute right-0 top-full mt-2 min-w-56 rounded-xl border border-tal-line bg-white shadow-lg py-2 z-30"
          >
            {email && (
              <div className="px-4 py-2 border-b border-tal-line mb-1">
                <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft mb-0.5">
                  Signed in as
                </div>
                <div className="text-sm text-tal-plum truncate" title={email}>
                  {email}
                </div>
              </div>
            )}
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
            <Link
              href="/subscription"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 hover:bg-tal-cream-soft"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft">
                    Subscription
                  </div>
                  <div className="text-sm font-medium text-tal-plum">
                    {isPremium ? "TAL Premium" : "Free plan"}
                  </div>
                </div>
                <span
                  className={
                    "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full " +
                    (isPremium
                      ? "bg-tal-plum text-white"
                      : "bg-tal-cream-soft text-tal-plum-soft border border-tal-line")
                  }
                >
                  {isPremium ? "Active" : "Upgrade"}
                </span>
              </div>
            </Link>
            <div className="my-1 border-t border-tal-line" />
            <button
              type="button"
              role="menuitem"
              onClick={takeTour}
              disabled={startingTour}
              className="w-full text-left px-4 py-2 text-sm text-tal-plum hover:bg-tal-cream-soft flex items-center gap-2 disabled:opacity-60"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                className="text-blue-600 shrink-0"
              >
                {/* Compass icon — signals 'guided tour' visually */}
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                <path
                  d="M15.5 8.5 13 13l-4.5 2.5L11 11l4.5-2.5Z"
                  fill="currentColor"
                />
              </svg>
              {startingTour ? "Starting tour…" : "Take the tour"}
            </button>
            <div className="my-1 border-t border-tal-line" />
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-tal-plum hover:bg-tal-cream-soft"
            >
              Privacy policy
            </a>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-tal-plum hover:bg-tal-cream-soft"
            >
              Terms &amp; conditions
            </a>
            <div className="my-1 border-t border-tal-line" />
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
