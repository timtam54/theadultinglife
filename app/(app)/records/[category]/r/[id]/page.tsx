import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getUserRecord, isCategoryId } from "@/lib/services/records";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { RecordEditor } from "@/components/RecordEditor";
import { StatusPill } from "@/components/StatusPill";

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
        initial={{
          title: record.title,
          fields: record.fields,
          expiryDate: record.expiry_date,
          notes: record.notes,
          subcategoryId: record.subcategory_id,
        }}
      />
    </div>
  );
}
