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
      <div className="rounded-2xl bg-black text-white px-6 py-4 mb-4 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
            Records
          </span>
          <h1 className="font-display text-2xl leading-tight">Life Admin</h1>
          <span className="text-white/40 mx-1" aria-hidden>·</span>
          <span className="text-sm text-white/80">
            {CATEGORY_IDS.length} categories
          </span>
          <Link
            href="/records/search"
            className="ml-auto h-8 px-3 rounded-xl bg-white text-black text-xs font-medium hover:bg-white/90 inline-flex items-center gap-1"
          >
            Search all records →
          </Link>
        </div>
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
