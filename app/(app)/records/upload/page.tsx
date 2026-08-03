import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { requireSession } from "@/lib/auth/session";
import { listUserSubcategories } from "@/lib/services/subcategories";
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import { subcategoryThumbnail } from "@/lib/thumbnails";
import { UploadFolderPicker } from "@/components/UploadFolderPicker";

export const metadata: Metadata = { title: "Upload a document" };

export default async function UploadPickerPage() {
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
        <span>Upload a document</span>
      </div>

      <header className="rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white px-5 py-4 mb-6 shadow-md">
        <div className="flex items-center gap-4 flex-wrap">
          <span
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 ring-1 ring-white/20 text-white shrink-0"
            aria-hidden
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 4v12m0-12-4 4m4-4 4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl sm:text-2xl leading-tight">
              Upload a document
            </h1>
            <p className="text-sm text-white/80 mt-1">
              Pick the folder this document belongs to and we&apos;ll save it
              there. You can turn it into a record later with AI Data Capture.
            </p>
          </div>
        </div>
      </header>

      <UploadFolderPicker groups={grouped} />
    </div>
  );
}
