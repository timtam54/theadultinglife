import Link from "next/link";
import { notFound } from "next/navigation";
import { isCategoryId } from "@/lib/services/records";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { RecordEditor } from "@/components/RecordEditor";

export default async function NewRecordPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isCategoryId(category)) notFound();

  return (
    <div>
      <Link
        href={`/records/${category}`}
        className="text-sm text-tal-plum-soft hover:text-tal-plum"
      >
        ← {CATEGORY_LABELS[category]}
      </Link>
      <h1 className="font-display text-3xl text-tal-plum mt-1 mb-6">
        New record
      </h1>
      <RecordEditor categoryId={category} mode="create" />
    </div>
  );
}
