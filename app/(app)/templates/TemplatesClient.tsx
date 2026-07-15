"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type BuiltIn = {
  title: string;
  body: string;
  href: string;
  categoryLabel: string;
  builtIn: true;
};

type Custom = {
  id: string;
  title: string;
  body: string;
  href: string;
  categoryLabel: string;
  visibility: "catalogue" | "user_private";
  isOwn: boolean;
};

export function TemplatesClient({
  builtIns,
  custom,
  isSuper,
}: {
  builtIns: BuiltIn[];
  custom: Custom[];
  isSuper: boolean;
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

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 gap-4 flex-wrap">
        <h1 className="font-display text-3xl text-tal-plum">
          Document Templates
        </h1>
        <Link
          href="/templates/new"
          className="h-10 px-4 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark inline-flex items-center gap-2"
        >
          + Create new template
        </Link>
      </div>
      <p className="text-tal-plum-soft mb-6">
        Fillable Adulting Life forms. Complete them in the app and the answers
        file into the right Life Admin section.
      </p>

      <div className="mb-6">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search templates by name or category…"
          className="w-full h-11 rounded-xl border border-tal-line px-4 text-sm"
        />
        {q && (
          <div className="mt-2 text-xs text-tal-plum-soft">
            {total} match{total === 1 ? "" : "es"}
          </div>
        )}
      </div>

      {filtered.builtIns.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-xl text-tal-plum mb-3">
            Built-in templates
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.builtIns.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="block rounded-2xl border border-tal-line bg-tal-cream-soft p-6 hover:shadow-md transition"
              >
                <div className="text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
                  {t.categoryLabel}
                </div>
                <h3 className="font-display text-xl text-tal-plum mb-2">
                  {t.title}
                </h3>
                <p className="text-sm text-tal-plum-soft">{t.body}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {filtered.custom.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-xl text-tal-plum mb-3">
            Custom templates
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.custom.map((t) => (
              <Link
                key={t.id}
                href={t.href}
                className="block rounded-2xl border border-tal-line bg-white p-6 hover:shadow-md transition"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-wider text-tal-plum-soft">
                    {t.categoryLabel}
                  </span>
                  <span
                    className={
                      "text-xs rounded-full px-2 py-0.5 " +
                      (t.visibility === "catalogue"
                        ? "bg-tal-cream text-tal-plum"
                        : "bg-blue-50 text-blue-800")
                    }
                  >
                    {t.visibility === "catalogue" ? "Catalogue" : "Private"}
                  </span>
                </div>
                <h3 className="font-display text-xl text-tal-plum mb-2">
                  {t.title}
                </h3>
                {t.body && (
                  <p className="text-sm text-tal-plum-soft">{t.body}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {total === 0 && (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center text-tal-plum-soft">
          No templates match &ldquo;{q}&rdquo;.
        </div>
      )}

      {!isSuper && (
        <p className="text-xs text-tal-plum-soft">
          You can create private templates just for yourself. Only super admins
          can publish to the catalogue.
        </p>
      )}
    </div>
  );
}
