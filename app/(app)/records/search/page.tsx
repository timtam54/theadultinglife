import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listUserRecords } from "@/lib/services/records";
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
  const results = await listUserRecords(session.user.id, { search: q });

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
          defaultValue={q ?? ""}
          placeholder="Search by title…"
          className="flex-1 h-11 rounded-xl border border-tal-line px-3 bg-white"
        />
        <button
          type="submit"
          className="h-11 px-4 rounded-xl bg-tal-plum text-white font-medium"
        >
          Search
        </button>
      </form>

      {results.length === 0 ? (
        <p className="text-tal-plum-soft">No records found.</p>
      ) : (
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.id}>
              <Link
                href={`/records/${r.category_id}/r/${r.id}`}
                className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3 hover:shadow-sm"
              >
                <div>
                  <div className="font-medium">{r.title}</div>
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
      )}
    </div>
  );
}
