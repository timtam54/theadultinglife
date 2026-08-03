import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { requireSession } from "@/lib/auth/session";
import { listUserSubcategories } from "@/lib/services/subcategories";
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import { subcategoryThumbnail } from "@/lib/thumbnails";
import { ScanFolderPicker } from "@/components/ScanFolderPicker";

export const metadata: Metadata = { title: "Scan a document" };

export default async function ScanPickerPage() {
  const session = await requireSession();
  const folders = await listUserSubcategories(session.user.id);

  const grouped = CATEGORY_IDS.map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
    folders: folders
      .filter((f) => f.category_id === id)
      // Skip form-only and family list folders — they don't accept ad-hoc records.
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
        <span>Scan a document</span>
      </div>

      <header className="rounded-2xl bg-black text-white px-5 py-4 mb-6 shadow-md">
        <div className="flex items-center gap-4 flex-wrap">
          <span
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 ring-1 ring-white/20 text-white shrink-0"
            aria-hidden
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 8h3l2-3h6l2 3h3v11H4V8Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="13"
                r="3.5"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl sm:text-2xl leading-tight">
              Scan a document
            </h1>
            <p className="text-sm text-white/70 mt-1">
              Pick the folder this document belongs to, then choose the photo or
              PDF. We&apos;ll extract the fields with AI and prefill a new
              record for you to review.
            </p>
          </div>
        </div>
      </header>

      <ScanFolderPicker groups={grouped} />
    </div>
  );
}
