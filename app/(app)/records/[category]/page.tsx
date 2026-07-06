import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { isCategoryId, listUserRecords } from "@/lib/services/records";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { StatusPill } from "@/components/StatusPill";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isCategoryId(category)) notFound();

  const session = await requireSession();
  const records = await listUserRecords(session.user.id, { categoryId: category });

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <Link
            href="/records"
            className="text-sm text-tal-plum-soft hover:text-tal-plum"
          >
            ← Life Admin
          </Link>
          <h1 className="font-display text-3xl text-tal-plum mt-1">
            {CATEGORY_LABELS[category]}
          </h1>
        </div>
        <Link
          href={`/records/${category}/new`}
          className="h-10 px-4 leading-10 rounded-xl bg-tal-plum text-white font-medium hover:bg-tal-plum-dark"
        >
          Add record
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center">
          <p className="text-tal-plum-soft mb-4">No records here yet.</p>
          <Link
            href={`/records/${category}/new`}
            className="inline-block h-10 px-4 leading-10 rounded-xl bg-tal-plum text-white font-medium hover:bg-tal-plum-dark"
          >
            Create your first
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li key={r.id}>
              <Link
                href={`/records/${category}/${r.id}`}
                className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3 hover:shadow-sm"
              >
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-tal-plum-soft">
                    {r.expiry_date ? `Expires ${r.expiry_date}` : "No expiry"}
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
