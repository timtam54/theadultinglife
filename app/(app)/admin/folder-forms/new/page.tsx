import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { getSession } from "@/lib/auth/session";
import { listConfiguredFormSummaries } from "@/lib/db/questions";
import { listAllCatalogueSubcategories } from "@/lib/db/subcategories";
import { CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import { NewFolderFormPicker } from "@/components/NewFolderFormPicker";

export const metadata: Metadata = { title: "New folder form" };

export default async function AdminFolderFormNewPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  const [subs, summaries] = await Promise.all([
    listAllCatalogueSubcategories(),
    listConfiguredFormSummaries(),
  ]);
  const withForm = new Set(summaries.map((s) => s.subcategoryId));
  const available = subs
    .filter((s) => !withForm.has(s.id))
    .map((s) => ({
      id: s.id,
      name: s.name,
      categoryLabel: CATEGORY_LABELS[s.category_id as CategoryId],
    }));

  return (
    <div className="max-w-2xl">
      <div className="mb-4 text-sm text-tal-plum-soft">
        <Link href="/admin/folder-forms" className="hover:underline">
          ← All folder forms
        </Link>
      </div>
      <h1 className="font-display text-3xl text-tal-plum mb-1">
        New folder form
      </h1>
      <p className="text-tal-plum-soft text-sm mb-6">
        Pick a folder that doesn&rsquo;t yet have a form. Saving fields on the
        next screen replaces that folder&rsquo;s free-form &ldquo;Add Record /
        Upload Document&rdquo; UI with a fixed set of fields.
      </p>
      <NewFolderFormPicker available={available} />
    </div>
  );
}
