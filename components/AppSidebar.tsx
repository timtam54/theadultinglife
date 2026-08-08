"use client";

import { GuardedLink as Link } from "@/components/GuardedLink";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/nav-items";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-black text-white shrink-0 min-h-screen">
      <Link
        href="/dashboard"
        aria-label="Go to dashboard"
        className="block px-6 pt-8 pb-6 rounded-2xl mx-2 hover:bg-white/5 transition-colors"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/LogoWhite.png"
          alt="The Adulting Life"
          width={2560}
          height={892}
          className="w-full h-auto"
        />
        <div className="text-[11px] text-center text-white/60 mt-3 leading-snug">
          Your life. Organised.
          <br />
          Your future. Secured.
        </div>
      </Link>

      <nav className="flex-1 px-3 pb-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors " +
                (active
                  ? "bg-tal-cream-soft text-tal-plum font-medium"
                  : "text-white/85 hover:bg-white/10")
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
          );
        })}
      </nav>

      <div className="px-4 pb-6">
        <div className="rounded-2xl bg-tal-cream-soft text-tal-plum p-5 text-center">
          <div className="flex justify-center mb-2">
            <HeartIcon />
          </div>
          <div className="font-display text-lg leading-tight mb-2">
            You&apos;ve got this!
          </div>
          <div className="text-xs text-tal-plum-soft leading-snug">
            One step at a time.
            <br />
            We&apos;re here to help.
          </div>
        </div>
      </div>
    </aside>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={28} height={28} aria-hidden>
      <path
        d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
