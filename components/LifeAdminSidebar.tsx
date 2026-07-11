"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";

const CATEGORY_ACCENT: Record<CategoryId, string> = {
  personal: "bg-rose-200",
  health: "bg-amber-200",
  education: "bg-sky-200",
  employment: "bg-red-300",
  admin: "bg-emerald-200",
};

export function LifeAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-tal-forest text-white shrink-0">
      <div className="px-6 py-8 border-b border-tal-forest-line/60">
        <div className="font-display text-lg leading-tight">
          The <span className="italic">Adulting</span>
          <br />
          Life
        </div>
        <div className="text-[10px] tracking-widest uppercase text-white/70 mt-1">
          est. 2024
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-1">
        <div className="px-6 py-2 text-xs uppercase tracking-widest text-white/60">
          Life Admin
        </div>
        {CATEGORY_IDS.map((id) => {
          const active =
            pathname === `/records/${id}` ||
            pathname.startsWith(`/records/${id}/`);
          return (
            <Link
              key={id}
              href={`/records/${id}`}
              className={`flex items-center gap-3 px-6 py-2.5 text-sm transition ${
                active
                  ? "bg-tal-forest-dark text-white font-medium"
                  : "text-white/85 hover:bg-tal-forest-soft/40"
              }`}
            >
              <span
                className={`h-6 w-6 rounded-md flex items-center justify-center ${CATEGORY_ACCENT[id]}`}
              >
                <span className="h-2 w-2 rounded-full bg-white/70" />
              </span>
              <span>{CATEGORY_LABELS[id]}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-6 pt-4">
        <Image
          src="/sidebar-tagline.png"
          alt="Organise today, thank yourself tomorrow."
          width={256}
          height={582}
          className="w-full h-auto rounded-lg"
        />
      </div>
    </aside>
  );
}
