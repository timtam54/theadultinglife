import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getUserRecord, isCategoryId } from "@/lib/services/records";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { RecordEditor } from "@/components/RecordEditor";
import { StatusPill } from "@/components/StatusPill";

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

  return (
    <div>
      <Link
        href={`/records/${category}`}
        className="text-sm text-tal-plum-soft hover:text-tal-plum"
      >
        ← {CATEGORY_LABELS[category]}
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
        }}
      />
    </div>
  );
}
