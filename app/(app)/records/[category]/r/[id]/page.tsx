import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getUserRecord, isCategoryId } from "@/lib/services/records";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { RecordEditor } from "@/components/RecordEditor";
import { StatusPill } from "@/components/StatusPill";
import { RecordAuditTrail } from "@/components/RecordAuditTrail";
import { listRecordHistory, listAllTagsForUser } from "@/lib/db/records";
import { listUsersInFamilyGroup } from "@/lib/db/users";
import { listSubcategoriesByIds } from "@/lib/db/subcategories";

function displayName(u: {
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
}): string {
  return (
    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
    u.name ||
    u.email ||
    "Someone"
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}): Promise<Metadata> {
  const { category, id } = await params;
  if (!isCategoryId(category)) return {};
  const session = await requireSession();
  const record = await getUserRecord(session.user.id, id);
  if (!record) return {};
  return { title: record.title };
}

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ category: string; id: string }>;
}) {
  const { category, id } = await params;
  if (!isCategoryId(category)) notFound();

  const session = await requireSession();
  const record = await getUserRecord(session.user.id, id);
  if (!record) notFound();

  const [history, familyUsers, suggestedTags, subcategoryRows] = await Promise.all([
    listRecordHistory(record.id),
    listUsersInFamilyGroup(session.user.familyGroupId),
    listAllTagsForUser(session.user.id),
    record.subcategory_id
      ? listSubcategoriesByIds([record.subcategory_id])
      : Promise.resolve([]),
  ]);
  const subcategoryName = subcategoryRows[0]?.name ?? null;
  const nameById = new Map(familyUsers.map((u) => [u.id, displayName(u)]));
  const owner = nameById.get(record.user_id) ?? "You";
  const events = history.map((h) => ({
    id: h.id,
    action: h.action,
    createdAt: h.created_at,
    actorName: h.actor_user_id ? nameById.get(h.actor_user_id) ?? null : null,
    changes: h.changes,
  }));

  return (
    <div>
      <nav aria-label="Breadcrumb" className="text-sm text-tal-plum-soft mb-2">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/records" className="hover:text-tal-plum hover:underline">
              Records
            </Link>
          </li>
          <li aria-hidden className="text-tal-plum-soft/60">›</li>
          <li>
            <Link
              href={`/records/${category}`}
              className="hover:text-tal-plum hover:underline"
            >
              {CATEGORY_LABELS[category]}
            </Link>
          </li>
          {record.subcategory_id && subcategoryName && (
            <>
              <li aria-hidden className="text-tal-plum-soft/60">›</li>
              <li>
                <Link
                  href={`/records/${category}/${encodeURIComponent(record.subcategory_id)}`}
                  className="hover:text-tal-plum hover:underline"
                >
                  {subcategoryName}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden className="text-tal-plum-soft/60">›</li>
          <li className="text-tal-plum font-medium truncate" aria-current="page">
            {record.title}
          </li>
        </ol>
      </nav>
      <div className="flex items-center justify-between mt-1 mb-6 gap-3">
        <h1 className="font-display text-3xl text-tal-plum">{record.title}</h1>
        {record.status && <StatusPill status={record.status} />}
      </div>
      <RecordEditor
        categoryId={category}
        mode="edit"
        recordId={record.id}
        suggestedTags={suggestedTags}
        initial={{
          title: record.title,
          fields: record.fields,
          expiryDate: record.expiry_date,
          notes: record.notes,
          subcategoryId: record.subcategory_id,
          tags: record.tags ?? [],
        }}
      />
      <RecordAuditTrail
        events={events}
        ownerName={owner}
        createdAt={record.created_at}
        updatedAt={record.updated_at}
      />
    </div>
  );
}
