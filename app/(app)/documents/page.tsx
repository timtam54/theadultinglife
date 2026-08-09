import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { requireSession } from "@/lib/auth/session";
import {
  listFamilyDocuments,
  type MimeGroup,
} from "@/lib/services/documents";
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import { DocumentActionsMenu } from "@/components/DocumentActionsMenu";
import { FileViewerButton } from "@/components/FileViewerButton";
import { truncateForRow } from "@/lib/ui/truncate";

export const metadata: Metadata = {
  title: "Documents",
  description:
    "Every document you've uploaded to The Adulting Life, in one calm library.",
};

const MIME_GROUPS: { id: MimeGroup; label: string }[] = [
  { id: "pdf", label: "PDF" },
  { id: "image", label: "Image" },
  { id: "other", label: "Other" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pickCategory(v?: string): CategoryId | undefined {
  return (CATEGORY_IDS as readonly string[]).includes(v ?? "")
    ? (v as CategoryId)
    : undefined;
}

function pickMime(v?: string): MimeGroup | undefined {
  return v === "pdf" || v === "image" || v === "other" ? v : undefined;
}

interface SP {
  category?: string;
  folder?: string;
  entry?: string;
  type?: string;
  addedFrom?: string;
  addedTo?: string;
  expiryFrom?: string;
  expiryTo?: string;
  q?: string;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await requireSession();
  const sp = await searchParams;

  const filters = {
    categoryId: pickCategory(sp.category),
    subcategoryId: sp.folder || undefined,
    recordId: sp.entry || undefined,
    mimeGroup: pickMime(sp.type),
    addedFrom: sp.addedFrom || undefined,
    addedTo: sp.addedTo || undefined,
    expiryFrom: sp.expiryFrom || undefined,
    expiryTo: sp.expiryTo || undefined,
    search: sp.q || undefined,
  };

  const { documents, subcategories, records, totalUnfiltered } =
    await listFamilyDocuments(session.user.familyGroupId, filters);

  const foldersForCategory = filters.categoryId
    ? subcategories.filter((s) => s.category_id === filters.categoryId)
    : subcategories;

  const entriesForContext = records
    .filter((r) => {
      if (filters.categoryId && r.category_id !== filters.categoryId) return false;
      if (filters.subcategoryId && r.subcategory_id !== filters.subcategoryId)
        return false;
      return true;
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const anyFilterApplied =
    !!filters.categoryId ||
    !!filters.subcategoryId ||
    !!filters.recordId ||
    !!filters.mimeGroup ||
    !!filters.addedFrom ||
    !!filters.addedTo ||
    !!filters.expiryFrom ||
    !!filters.expiryTo ||
    !!filters.search;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
        <Link
          href="/dashboard"
          className="text-tal-plum-soft hover:text-tal-plum transition-colors"
        >
          Dashboard
        </Link>
        <span className="text-tal-plum-soft/50" aria-hidden>
          /
        </span>
        <span className="text-tal-plum-soft">Documents</span>
      </div>

      <header className="mb-6">
        <h1 className="font-display text-3xl text-tal-plum">Documents</h1>
        <p className="text-sm text-tal-plum-soft mt-1">
          Every file you&apos;ve uploaded, in one calm library. Filter by
          folder, entry, type or date.
        </p>
      </header>

      <form
        method="get"
        className="rounded-2xl border border-tal-line bg-white p-4 mb-4 grid gap-3 md:grid-cols-3"
      >
        <label className="block">
          <span className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
            Search
          </span>
          <input
            type="text"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Filename, folder, entry…"
            className="w-full h-10 rounded-xl border border-tal-line px-3 bg-white text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
            Category
          </span>
          <select
            name="category"
            defaultValue={sp.category ?? ""}
            className="w-full h-10 rounded-xl border border-tal-line px-3 bg-white text-sm"
          >
            <option value="">All categories</option>
            {CATEGORY_IDS.map((id) => (
              <option key={id} value={id}>
                {CATEGORY_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
            Folder
          </span>
          <select
            name="folder"
            defaultValue={sp.folder ?? ""}
            className="w-full h-10 rounded-xl border border-tal-line px-3 bg-white text-sm"
          >
            <option value="">All folders</option>
            {foldersForCategory.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
            Linked entry
          </span>
          <select
            name="entry"
            defaultValue={sp.entry ?? ""}
            className="w-full h-10 rounded-xl border border-tal-line px-3 bg-white text-sm"
          >
            <option value="">Any entry</option>
            {entriesForContext.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
            Document type
          </span>
          <select
            name="type"
            defaultValue={sp.type ?? ""}
            className="w-full h-10 rounded-xl border border-tal-line px-3 bg-white text-sm"
          >
            <option value="">Any type</option>
            {MIME_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-1">
          <span className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
            Date added
          </span>
          <div className="flex gap-2">
            <input
              type="date"
              name="addedFrom"
              defaultValue={sp.addedFrom ?? ""}
              aria-label="Added from"
              className="flex-1 h-10 rounded-xl border border-tal-line px-3 bg-white text-sm"
            />
            <input
              type="date"
              name="addedTo"
              defaultValue={sp.addedTo ?? ""}
              aria-label="Added to"
              className="flex-1 h-10 rounded-xl border border-tal-line px-3 bg-white text-sm"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <span className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
            Expiry date
          </span>
          <div className="flex gap-2">
            <input
              type="date"
              name="expiryFrom"
              defaultValue={sp.expiryFrom ?? ""}
              aria-label="Expires from"
              className="flex-1 h-10 rounded-xl border border-tal-line px-3 bg-white text-sm"
            />
            <input
              type="date"
              name="expiryTo"
              defaultValue={sp.expiryTo ?? ""}
              aria-label="Expires to"
              className="flex-1 h-10 rounded-xl border border-tal-line px-3 bg-white text-sm"
            />
          </div>
        </div>
        <div className="md:col-span-3 flex items-center gap-2 justify-end">
          {anyFilterApplied && (
            <Link
              href="/documents"
              className="h-10 px-4 rounded-xl border border-tal-line text-tal-plum text-sm hover:bg-tal-cream-soft inline-flex items-center"
            >
              Clear filters
            </Link>
          )}
          <button
            type="submit"
            className="h-10 px-5 rounded-xl bg-black text-white text-sm font-medium"
          >
            Apply
          </button>
        </div>
      </form>

      <p className="text-sm text-tal-plum-soft mb-3">
        {documents.length} of {totalUnfiltered} document
        {totalUnfiltered === 1 ? "" : "s"}
      </p>

      {documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center text-tal-plum-soft">
          {anyFilterApplied
            ? "Nothing matches those filters. Try clearing one."
            : "No documents uploaded yet. Add one from any Life Admin folder."}
        </div>
      ) : (
        <div className="rounded-2xl border border-tal-line bg-white overflow-hidden">
          <ul className="divide-y divide-tal-line">
            {documents.map((d) => (
              <li key={d.file.id} className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex items-start gap-3">
                    <span
                      className={
                        "shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md " +
                        (d.mimeGroup === "pdf"
                          ? "bg-red-100 text-red-800"
                          : d.mimeGroup === "image"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-700")
                      }
                    >
                      {d.mimeGroup.toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <FileViewerButton
                        fileId={d.file.id}
                        filename={d.file.filename}
                        mimeType={d.file.mime_type}
                        className="font-medium text-left text-tal-plum hover:underline disabled:opacity-60 break-all"
                        title={d.file.filename}
                      >
                        {truncateForRow(d.file.filename, 40)}
                      </FileViewerButton>
                      <div className="text-xs text-tal-plum-soft mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{fmtSize(d.file.size_bytes)}</span>
                        <span aria-hidden>·</span>
                        <span>Added {fmtDate(d.file.created_at)}</span>
                        {d.expiryDate && (
                          <>
                            <span aria-hidden>·</span>
                            <span>Expires {fmtDate(d.expiryDate)}</span>
                          </>
                        )}
                        <span aria-hidden>·</span>
                        <span>{d.ownerName}</span>
                      </div>
                      <div className="text-xs text-tal-plum-soft mt-1 flex items-center gap-2 flex-wrap">
                        {d.subcategoryId && d.categoryId ? (
                          <Link
                            href={`/records/${d.categoryId}/${encodeURIComponent(d.subcategoryId)}`}
                            className="hover:text-tal-plum hover:underline"
                          >
                            {d.subcategoryName ?? d.subcategoryId}
                          </Link>
                        ) : (
                          <span className="italic">Not linked to a folder</span>
                        )}
                        {d.linkedRecordId && d.categoryId && (
                          <>
                            <span aria-hidden>·</span>
                            <Link
                              href={`/records/${d.categoryId}/r/${d.linkedRecordId}`}
                              className="hover:text-tal-plum hover:underline"
                            >
                              {d.linkedRecordTitle}
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <DocumentActionsMenu
                    fileId={d.file.id}
                    filename={d.file.filename}
                    mimeType={d.file.mime_type}
                    linkedRecordId={d.linkedRecordId}
                    subcategoryId={d.subcategoryId}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
