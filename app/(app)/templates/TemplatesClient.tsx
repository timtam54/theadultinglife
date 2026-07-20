"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CategoryId } from "@/lib/db/types";

type BuiltIn = {
  id: string;
  title: string;
  body: string;
  href: string;
  categoryId: CategoryId;
  categoryLabel: string;
  thumbnailUrl: string;
};

type Custom = {
  id: string;
  title: string;
  body: string;
  href: string;
  categoryId: CategoryId;
  categoryLabel: string;
  visibility: "catalogue" | "user_private";
  isOwn: boolean;
  thumbnailUrl: string;
};

const CATEGORY_TONE: Record<
  CategoryId,
  { bg: string; ring: string; iconBg: string; iconText: string; pill: string }
> = {
  personal: {
    bg: "bg-violet-50",
    ring: "ring-violet-100",
    iconBg: "bg-violet-100",
    iconText: "text-violet-700",
    pill: "bg-violet-100 text-violet-800",
  },
  health: {
    bg: "bg-amber-50",
    ring: "ring-amber-100",
    iconBg: "bg-amber-100",
    iconText: "text-amber-700",
    pill: "bg-amber-100 text-amber-800",
  },
  education: {
    bg: "bg-sky-50",
    ring: "ring-sky-100",
    iconBg: "bg-sky-100",
    iconText: "text-sky-700",
    pill: "bg-sky-100 text-sky-800",
  },
  employment: {
    bg: "bg-rose-50",
    ring: "ring-rose-100",
    iconBg: "bg-rose-100",
    iconText: "text-rose-700",
    pill: "bg-rose-100 text-rose-800",
  },
  admin: {
    bg: "bg-emerald-50",
    ring: "ring-emerald-100",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-700",
    pill: "bg-emerald-100 text-emerald-800",
  },
};

export function TemplatesClient({
  builtIns,
  custom,
  isSuper,
}: {
  builtIns: BuiltIn[];
  custom: Custom[];
  isSuper: boolean;
  categoryFallbacks: Record<CategoryId, string>;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return { builtIns, custom };
    const match = (s: string) => s.toLowerCase().includes(needle);
    return {
      builtIns: builtIns.filter(
        (t) => match(t.title) || match(t.body) || match(t.categoryLabel)
      ),
      custom: custom.filter(
        (t) => match(t.title) || match(t.body) || match(t.categoryLabel)
      ),
    };
  }, [q, builtIns, custom]);

  const total = filtered.builtIns.length + filtered.custom.length;
  const totalAll = builtIns.length + custom.length;
  const categoriesCovered = new Set(
    [...builtIns, ...custom].map((t) => t.categoryId)
  ).size;

  return (
    <div>
      <header className="rounded-2xl bg-tal-cream-soft border border-tal-line px-5 py-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-tal-plum text-white shrink-0"
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M8 12h6M8 16h4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <h1 className="font-display text-2xl text-tal-plum leading-tight">
            Templates
          </h1>
          <span className="text-tal-plum-soft/50" aria-hidden>
            ·
          </span>
          <p className="text-tal-plum-soft text-sm">
            Fillable Adulting Life forms — answers save into the right Life
            Admin section.
          </p>
          <div className="ml-auto">
            <Link
              href="/templates/new"
              className="h-9 px-3 rounded-lg bg-black text-white text-sm font-medium hover:bg-tal-plum-dark inline-flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Create template
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <StatCard
          tone="violet"
          icon={<DocIcon />}
          value={`${totalAll} template${totalAll === 1 ? "" : "s"}`}
          subtitle="Ready to fill in"
          href="#templates"
        />
        <StatCard
          tone="sky"
          icon={<GridIcon />}
          value={`${categoriesCovered} of 5 categories`}
          subtitle="Across your Life Admin"
          href="/records"
        />
        <StatCard
          tone="emerald"
          icon={<ShieldIcon />}
          value="Fill once, saved forever"
          subtitle="Answers file into Life Admin"
          href="/security"
        />
      </div>

      <div className="mb-6">
        <div className="relative">
          <span
            className="absolute inset-y-0 left-3 flex items-center text-tal-plum-soft"
            aria-hidden
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" />
              <path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates by name or category…"
            className="w-full h-11 rounded-xl border border-tal-line bg-white pl-10 pr-4 text-sm"
          />
        </div>
        {q && (
          <div className="mt-2 text-xs text-tal-plum-soft">
            {total} match{total === 1 ? "" : "es"}
          </div>
        )}
      </div>

      <h2
        id="templates"
        className="font-display text-xl text-tal-plum mb-3 scroll-mt-4"
      >
        Choose a template to fill in
      </h2>

      {filtered.builtIns.length > 0 && (
        <section className="mb-8">
          <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft font-medium mb-2">
            Built in
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.builtIns.map((t) => (
              <TemplateTile
                key={t.id}
                href={t.href}
                title={t.title}
                body={t.body}
                categoryId={t.categoryId}
                categoryLabel={t.categoryLabel}
                thumbnailUrl={t.thumbnailUrl}
                badge={null}
              />
            ))}
          </div>
        </section>
      )}

      {filtered.custom.length > 0 && (
        <section className="mb-8">
          <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft font-medium mb-2">
            Custom
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.custom.map((t) => (
              <TemplateTile
                key={t.id}
                href={t.href}
                title={t.title}
                body={t.body}
                categoryId={t.categoryId}
                categoryLabel={t.categoryLabel}
                thumbnailUrl={t.thumbnailUrl}
                badge={
                  t.visibility === "user_private" ? "Private" : "Catalogue"
                }
              />
            ))}
          </div>
        </section>
      )}

      {total === 0 && (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center text-tal-plum-soft">
          {q
            ? `No templates match "${q}".`
            : "No templates yet. Create your first one to get started."}
        </div>
      )}

      {!isSuper && (
        <p className="text-xs text-tal-plum-soft mt-4">
          You can create private templates just for yourself. Only super admins
          can publish to the catalogue.
        </p>
      )}
    </div>
  );
}

function TemplateTile({
  href,
  title,
  body,
  categoryId,
  categoryLabel,
  thumbnailUrl,
  badge,
}: {
  href: string;
  title: string;
  body: string;
  categoryId: CategoryId;
  categoryLabel: string;
  thumbnailUrl: string;
  badge: string | null;
}) {
  const tone = CATEGORY_TONE[categoryId];
  return (
    <Link
      href={href}
      className={
        "group flex flex-col rounded-2xl ring-1 p-5 hover:shadow-md hover:-translate-y-0.5 transition " +
        tone.bg +
        " " +
        tone.ring
      }
    >
      <div className="flex items-start gap-3 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt=""
          width={64}
          height={64}
          className="shrink-0 w-16 h-16 rounded-xl object-cover ring-1 ring-white bg-white"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span
              className={
                "text-[10px] uppercase tracking-widest font-medium px-2 py-0.5 rounded-full " +
                tone.pill
              }
            >
              {categoryLabel}
            </span>
            {badge && (
              <span className="text-[10px] uppercase tracking-widest font-medium px-2 py-0.5 rounded-full bg-white/70 text-tal-plum-soft">
                {badge}
              </span>
            )}
          </div>
          <div className="font-display text-lg text-tal-plum leading-tight">
            {title}
          </div>
          {body && (
            <p className="text-xs text-tal-plum-soft mt-1 leading-snug line-clamp-2">
              {body}
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between">
        <span className="text-xs text-tal-plum-soft">Fillable form</span>
        <span
          className={
            "inline-flex items-center gap-1 text-xs font-medium " + tone.iconText
          }
        >
          Open
          <span
            aria-hidden
            className="transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

function StatCard({
  tone,
  icon,
  value,
  subtitle,
  href,
}: {
  tone: "violet" | "sky" | "emerald";
  icon: React.ReactNode;
  value: string;
  subtitle: string;
  href: string;
}) {
  const bg =
    tone === "violet"
      ? "bg-violet-50 ring-violet-100"
      : tone === "sky"
        ? "bg-sky-50 ring-sky-100"
        : "bg-emerald-50 ring-emerald-100";
  const iconBg =
    tone === "violet"
      ? "bg-violet-100 text-violet-700"
      : tone === "sky"
        ? "bg-sky-100 text-sky-700"
        : "bg-emerald-100 text-emerald-700";
  return (
    <Link
      href={href}
      className={
        "group rounded-2xl ring-1 p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition " +
        bg
      }
    >
      <span
        className={
          "inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 " +
          iconBg
        }
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-tal-plum leading-tight">
          {value}
        </div>
        <div className="text-[11px] text-tal-plum-soft mt-0.5">{subtitle}</div>
      </div>
      <span
        className="text-tal-plum-soft/70 group-hover:text-tal-plum transition-colors shrink-0"
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}

function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M8 12h6M8 16h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 4 6v6c0 4.5 3 8 8 9 5-1 8-4.5 8-9V6l-8-3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
