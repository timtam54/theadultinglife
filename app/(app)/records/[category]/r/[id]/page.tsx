import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getUserRecord, isCategoryId } from "@/lib/services/records";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { RecordEditor } from "@/components/RecordEditor";
import { StatusPill } from "@/components/StatusPill";
import { RecordAuditTrail } from "@/components/RecordAuditTrail";
import { listRecordHistory, listAllTagsForUser } from "@/lib/db/records";
import { listUsersInFamilyGroup } from "@/lib/db/users";

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

  const [history, familyUsers, suggestedTags] = await Promise.all([
    listRecordHistory(record.id),
    listUsersInFamilyGroup(session.user.familyGroupId),
    listAllTagsForUser(session.user.id),
  ]);
  const nameById = new Map(familyUsers.map((u) => [u.id, displayName(u)]));
  const owner = nameById.get(record.user_id) ?? "You";
  const events = history.map((h) => ({
    id: h.id,
    action: h.action,
    createdAt: h.created_at,
    actorName: h.actor_user_id ? nameById.get(h.actor_user_id) ?? null : null,
    changes: h.changes,
  }));

  const backHref = record.subcategory_id
    ? `/records/${category}/${encodeURIComponent(record.subcategory_id)}`
    : `/records/${category}`;
  const backLabel = record.subcategory_id
    ? "Back to folder"
    : CATEGORY_LABELS[category];

  return (
    <div>
      <Link
        href={backHref}
        className="text-sm text-tal-plum-soft hover:text-tal-plum"
      >
        ← {backLabel}
      </Link>
      <div className="flex items-center justify-between mt-1 mb-6">
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
