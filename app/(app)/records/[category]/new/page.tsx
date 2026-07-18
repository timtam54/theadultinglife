import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { isCategoryId } from "@/lib/services/records";
import { getUserSubcategory } from "@/lib/services/subcategories";
import { CATEGORY_LABELS, type RecordField } from "@/lib/db/types";
import { RecordEditor } from "@/components/RecordEditor";
import { listAllTagsForUser } from "@/lib/db/records";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!isCategoryId(category)) return {};
  return { title: `New record · ${CATEGORY_LABELS[category]}` };
}

export default async function NewRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ subcategory?: string }>;
}) {
  const { category } = await params;
  if (!isCategoryId(category)) notFound();
  const { subcategory } = await searchParams;

  const session = await requireSession();
  const suggestedTags = await listAllTagsForUser(session.user.id);

  let defaultFields: RecordField[] = [];
  if (subcategory) {
    const folder = await getUserSubcategory(session.user.id, subcategory);
    if (folder?.default_fields?.length) {
      defaultFields = folder.default_fields.map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        value: "",
      }));
    }
  }

  return (
    <div>
      <Link
        href={
          subcategory
            ? `/records/${category}/${encodeURIComponent(subcategory)}`
            : `/records/${category}`
        }
        className="text-sm text-tal-plum-soft hover:text-tal-plum"
      >
        ← {CATEGORY_LABELS[category]}
      </Link>
      <h1 className="font-display text-3xl text-tal-plum mt-1 mb-6">
        New record
      </h1>
      <RecordEditor
        categoryId={category}
        subcategoryId={subcategory ?? null}
        mode="create"
        enableScan={category === "personal"}
        suggestedTags={suggestedTags}
        initial={
          defaultFields.length
            ? {
                title: "",
                fields: defaultFields,
                expiryDate: null,
                notes: null,
                subcategoryId: subcategory ?? null,
                tags: [],
              }
            : undefined
        }
      />
    </div>
  );
}
