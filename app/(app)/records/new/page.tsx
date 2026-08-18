import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { requireSession } from "@/lib/auth/session";
import { listUserSubcategories } from "@/lib/services/subcategories";
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import { subcategoryThumbnail, dashboardThumbnail } from "@/lib/thumbnails";
import { AddRecordFolderPicker } from "@/components/AddRecordFolderPicker";

export const metadata: Metadata = { title: "Add a record" };

export default async function AddRecordPickerPage() {
  const session = await requireSession();
  const folders = await listUserSubcategories(session.user.id);

  const grouped = CATEGORY_IDS.map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
    folders: folders
      .filter((f) => f.category_id === id)
      .filter(
        (f) => f.scope !== "user_list" && f.template_group !== "peace_of_mind"
      )
      .map((f) => ({
        id: f.id,
        name: f.name,
        categoryId: f.category_id as CategoryId,
        thumbnailUrl: subcategoryThumbnail(f.id, f.category_id),
      })),
  })).filter((g) => g.folders.length > 0);

  return (
    <div>
      <div className="text-sm text-tal-plum-soft mb-3 flex-wrap flex items-center gap-2">
        <Link href="/dashboard" className="hover:text-tal-plum">
          Dashboard
        </Link>
        <span className="text-tal-plum-soft/50" aria-hidden>·</span>
        <span>Add a record</span>
      </div>

      <header className="rounded-2xl bg-gradient-to-br from-violet-700 to-violet-900 text-white px-5 py-4 mb-6 shadow-md">
        <div className="flex items-center gap-4 flex-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dashboardThumbnail("add-record")}
            alt=""
            width={44}
            height={44}
            className="w-11 h-11 rounded-xl object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl sm:text-2xl leading-tight">
              Add a record
            </h1>
            <p className="text-sm text-white/80 mt-1">
              Pick the folder this record belongs to. We&apos;ll set up the
              right fields for you — or you can scan a document to fill them in
              with AI.
            </p>
          </div>
        </div>
      </header>

      <AddRecordFolderPicker groups={grouped} />
    </div>
  );
}
