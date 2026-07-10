import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listUserRecords } from "@/lib/services/records";
import { CATEGORY_IDS, CATEGORY_LABELS } from "@/lib/db/types";

export default async function RecordsIndex() {
  const session = await requireSession();
  const all = await listUserRecords(session.user.id);
  const countByCategory = new Map<string, number>();
  for (const r of all) {
    countByCategory.set(r.category_id, (countByCategory.get(r.category_id) ?? 0) + 1);
  }
  const expiringSoon = all.filter(
    (r) => r.status === "expiring_soon" || r.status === "expired"
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl text-tal-plum">Life Admin</h1>
        <Link
          href="/records/search"
          className="text-sm text-tal-plum hover:underline"
        >
          Search all records →
        </Link>
      </div>

      {expiringSoon.length > 0 && (
        <div className="mb-6 rounded-2xl border border-tal-line bg-tal-cream p-4">
          <h2 className="font-display text-tal-plum mb-2">
            Expiring or expired ({expiringSoon.length})
          </h2>
          <ul className="text-sm space-y-1">
            {expiringSoon.slice(0, 5).map((r) => (
              <li key={r.id}>
                <Link
                  href={`/records/${r.category_id}/r/${r.id}`}
                  className="hover:underline"
                >
                  <span className="font-medium">{r.title}</span>{" "}
                  <span className="text-tal-plum-soft">
                    — {CATEGORY_LABELS[r.category_id]} · expires {r.expiry_date}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm text-tal-plum-soft mb-4">
        Choose a category from the sidebar, or jump in below.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_IDS.map((id) => (
          <Link
            key={id}
            href={`/records/${id}`}
            className="block rounded-2xl border border-tal-line bg-white p-6 hover:shadow-md transition"
          >
            <h2 className="font-display text-xl text-tal-plum mb-1">
              {CATEGORY_LABELS[id]}
            </h2>
            <p className="text-sm text-tal-plum-soft">
              {countByCategory.get(id) ?? 0} records
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
