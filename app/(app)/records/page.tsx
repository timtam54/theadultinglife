import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listUserRecords } from "@/lib/services/records";
import { categoryProgressForFamily } from "@/lib/services/folder-completion";
import { CATEGORY_IDS, CATEGORY_LABELS } from "@/lib/db/types";

export default async function RecordsIndex() {
  const session = await requireSession();
  const [all, categoryProgress] = await Promise.all([
    listUserRecords(session.user.id),
    categoryProgressForFamily(session.user.familyGroupId),
  ]);
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
        {CATEGORY_IDS.map((id) => {
          const p = categoryProgress.get(id);
          const done = p?.completedFolders ?? 0;
          const total = p?.totalFolders ?? 0;
          const started = p?.startedFolders ?? 0;
          const tone: "done" | "partial" | "empty" =
            total === 0
              ? "empty"
              : done >= total
              ? "done"
              : started > 0
              ? "partial"
              : "empty";
          const cardBg =
            tone === "done"
              ? "bg-green-50 hover:bg-green-100 border-green-200"
              : tone === "partial"
              ? "bg-amber-50 hover:bg-amber-100 border-amber-200"
              : "bg-red-50 hover:bg-red-100 border-red-200";
          const pillCls =
            tone === "done"
              ? "bg-green-100 text-green-800 border-green-200"
              : tone === "partial"
              ? "bg-amber-100 text-amber-800 border-amber-200"
              : "bg-red-100 text-red-800 border-red-200";
          return (
            <Link
              key={id}
              href={`/records/${id}`}
              className={
                "block rounded-2xl border p-6 hover:shadow-md transition " +
                cardBg
              }
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-xl text-tal-plum">
                  {CATEGORY_LABELS[id]}
                </h2>
                <span
                  className={
                    "text-xs tabular-nums px-2 py-0.5 rounded-full border shrink-0 " +
                    pillCls
                  }
                >
                  {done}/{total}
                </span>
              </div>
              <p className="text-sm text-tal-plum-soft mt-1">
                {done === total
                  ? "All folders complete"
                  : `${done} of ${total} folders complete`}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
