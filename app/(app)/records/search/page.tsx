import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listUserRecords } from "@/lib/services/records";
import { searchSubcategoriesForUser } from "@/lib/db/subcategories";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { StatusPill } from "@/components/StatusPill";

export const metadata: Metadata = {
  title: "Search records",
};

export default async function RecordsSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [records, folders] = query
    ? await Promise.all([
        listUserRecords(session.user.id, { search: query }),
        searchSubcategoriesForUser(session.user.id, query),
      ])
    : [[], []];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-display text-3xl text-tal-plum">Search records</h1>
        <Link href="/records" className="text-sm text-tal-plum hover:underline">
          ← Back
        </Link>
      </div>
      <form method="get" className="mb-6 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search folders, titles, notes or field values…"
          className="flex-1 h-11 rounded-xl border border-tal-line px-3 bg-white"
        />
        <button
          type="submit"
          className="h-11 px-4 rounded-xl bg-tal-plum text-white font-medium"
        >
          Search
        </button>
      </form>

      {!query ? (
        <p className="text-tal-plum-soft">
          Type something above to search across your folders and records.
        </p>
      ) : folders.length === 0 && records.length === 0 ? (
        <p className="text-tal-plum-soft">
          Nothing matched &ldquo;{query}&rdquo;. Try a shorter or different
          word.
        </p>
      ) : (
        <div className="space-y-8">
          {folders.length > 0 && (
            <section>
              <h2 className="font-display text-tal-plum mb-2">
                Folders ({folders.length})
              </h2>
              <ul className="space-y-2">
                {folders.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/records/${f.category_id}/${encodeURIComponent(f.id)}`}
                      className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3 hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{f.name}</div>
                        <div className="text-xs text-tal-plum-soft">
                          {CATEGORY_LABELS[f.category_id]}
                          {f.hint ? ` · ${f.hint}` : ""}
                        </div>
                      </div>
                      <span className="text-tal-plum-soft" aria-hidden>
                        ›
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {records.length > 0 && (
            <section>
              <h2 className="font-display text-tal-plum mb-2">
                Records ({records.length})
              </h2>
              <ul className="space-y-2">
                {records.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/records/${r.category_id}/r/${r.id}`}
                      className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3 hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.title}</div>
                        <div className="text-xs text-tal-plum-soft">
                          {CATEGORY_LABELS[r.category_id]}
                          {r.expiry_date ? ` · expires ${r.expiry_date}` : ""}
                        </div>
                      </div>
                      {r.status && <StatusPill status={r.status} />}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
