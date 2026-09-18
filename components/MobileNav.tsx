"use client";

import { GuardedLink as Link } from "@/components/GuardedLink";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_ITEMS } from "@/components/nav-items";
import { BrandLogo } from "@/components/BrandLogo";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [expandedHint, setExpandedHint] = useState<string | null>(null);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // The tour engine dispatches `tal:mobile-nav:open` / `:close` so it can
  // reveal the sidebar-* highlight targets on phones. Without this, every
  // sidebar step would time out (the desktop <AppSidebar> is hidden md:flex
  // — the mobile drawer holds the real anchors).
  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    function onClose() {
      setOpen(false);
    }
    window.addEventListener("tal:mobile-nav:open", onOpen);
    window.addEventListener("tal:mobile-nav:close", onClose);
    return () => {
      window.removeEventListener("tal:mobile-nav:open", onOpen);
      window.removeEventListener("tal:mobile-nav:close", onClose);
    };
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full text-tal-plum hover:bg-tal-cream transition-colors"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />

          {/* Drawer */}
          <aside
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            className="relative flex flex-col w-72 max-w-[85vw] bg-black text-white shadow-2xl overflow-y-auto"
          >
            <div className="flex items-center justify-between px-4 pt-4">
              <Link
                href="/dashboard"
                aria-label="Go to dashboard"
                className="block flex-1"
                onClick={() => setOpen(false)}
              >
                <BrandLogo iconClassName="h-10 w-10" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white/80 hover:bg-white/10"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="text-[11px] text-center text-white/60 mt-1 mb-4 leading-snug">
              Your life. Organised.
              <br />
              Your future. Secured.
            </div>

            <nav className="flex-1 px-3 pb-6 space-y-1">
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const isHintOpen = expandedHint === item.href;
                const tourKey =
                  item.href === "/dashboard" ? "sidebar-dashboard"
                  : item.href === "/welcome" ? "sidebar-setup-guide"
                  : item.href === "/records" ? "sidebar-organiser"
                  : item.href === "/receipts" ? "sidebar-receipts"
                  : item.href === "/tasks" ? "sidebar-tasks"
                  : item.href === "/reminders" ? "sidebar-reminders"
                  : item.href === "/settings" ? "sidebar-settings"
                  : item.href === "/templates/peace-of-mind-planner"
                    ? "sidebar-planner"
                  : null;
                return (
                  <div key={item.href}>
                    <div
                      className={
                        "flex items-center gap-1 rounded-xl transition-colors " +
                        (active
                          ? "bg-tal-cream-soft"
                          : "hover:bg-white/10")
                      }
                    >
                      <Link
                        href={item.href}
                        data-tour={tourKey ?? undefined}
                        onClick={() => setOpen(false)}
                        className={
                          "flex-1 flex items-center gap-3 px-3 py-2.5 text-sm " +
                          (active
                            ? "text-tal-plum font-medium"
                            : "text-white/85")
                        }
                      >
                        <span className="shrink-0 w-5 h-5 flex items-center justify-center">
                          {item.icon}
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span
                            className={
                              "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full " +
                              (active
                                ? "bg-black text-white"
                                : "bg-white text-black")
                            }
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                      {item.hint && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedHint(isHintOpen ? null : item.href)
                          }
                          aria-label={
                            isHintOpen
                              ? `Hide ${item.label} description`
                              : `What is ${item.label}?`
                          }
                          aria-expanded={isHintOpen}
                          className={
                            "shrink-0 inline-flex items-center justify-center w-8 h-8 mr-1 rounded-full text-xs font-semibold " +
                            (active
                              ? "text-tal-plum/70 hover:bg-tal-plum/10"
                              : "text-white/70 hover:bg-white/10")
                          }
                        >
                          ⓘ
                        </button>
                      )}
                    </div>
                    {isHintOpen && item.hint && (
                      <div className="mx-3 mt-1 mb-2 px-3 py-2 rounded-xl bg-white/10 text-xs text-white/85 leading-relaxed">
                        {item.hint}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
