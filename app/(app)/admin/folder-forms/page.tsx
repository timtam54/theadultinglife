import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { getSession } from "@/lib/auth/session";
import {
  listConfiguredFormSummaries,
  listQuestionsBySubcategory,
} from "@/lib/db/questions";
import {
  listAllCatalogueSubcategories,
  listSubcategoriesByIds,
} from "@/lib/db/subcategories";
import {
  CATEGORY_IDS,
  CATEGORY_LABELS,
  type CategoryId,
  type PageQuestionRow,
} from "@/lib/db/types";
import { subcategoryThumbnail } from "@/lib/thumbnails";
import { RequiredPill } from "@/components/RequiredPill";

const CATEGORY_TINT: Record<
  CategoryId,
  { cardBg: string; cardRing: string; pill: string; tabActive: string }
> = {
  personal: {
    cardBg: "bg-violet-50",
    cardRing: "ring-violet-100",
    pill: "bg-violet-100 text-violet-800",
    tabActive: "bg-violet-600 text-white",
  },
  health: {
    cardBg: "bg-amber-50",
    cardRing: "ring-amber-100",
    pill: "bg-amber-100 text-amber-800",
    tabActive: "bg-amber-600 text-white",
  },
  education: {
    cardBg: "bg-sky-50",
    cardRing: "ring-sky-100",
    pill: "bg-sky-100 text-sky-800",
    tabActive: "bg-sky-600 text-white",
  },
  employment: {
    cardBg: "bg-rose-50",
    cardRing: "ring-rose-100",
    pill: "bg-rose-100 text-rose-800",
    tabActive: "bg-rose-600 text-white",
  },
  admin: {
    cardBg: "bg-emerald-50",
    cardRing: "ring-emerald-100",
    pill: "bg-emerald-100 text-emerald-800",
    tabActive: "bg-emerald-600 text-white",
  },
};

function isCategoryId(v: string | undefined): v is CategoryId {
  return !!v && (CATEGORY_IDS as readonly string[]).includes(v);
}

export const metadata: Metadata = { title: "Folder forms" };

interface FormEntry {
  subcategoryId: string;
  pageGroup: string;
  fieldCount: number;
  subcategoryName: string;
  categoryId: CategoryId;
  href: string;
}

export default async function AdminFolderFormsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; cat?: string }>;
}) {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();

  const { view, cat } = await searchParams;
  const isPreview = view === "preview";
  const activeCategory = isCategoryId(cat) ? cat : null;

  if (isPreview) return <PreviewView activeCategory={activeCategory} />;
  return <ListView />;
}

async function ListView() {
  const summaries = await listConfiguredFormSummaries();
  const subs = await listSubcategoriesByIds(summaries.map((s) => s.subcategoryId));
  const subMap = new Map(subs.map((s) => [s.id, s]));

  const entries: FormEntry[] = summaries
    .map((s) => {
      const sub = subMap.get(s.subcategoryId);
      return {
        subcategoryId: s.subcategoryId,
        pageGroup: s.pageGroup,
        fieldCount: s.fieldCount,
        subcategoryName: sub?.name ?? s.subcategoryId,
        categoryId: (sub?.category_id ?? "personal") as CategoryId,
        href: `/admin/folder-forms/${encodeURIComponent(s.subcategoryId)}`,
      };
    })
    .sort(
      (a, b) =>
        a.categoryId.localeCompare(b.categoryId) ||
        a.subcategoryName.localeCompare(b.subcategoryName)
    );

  const byCategory = new Map<CategoryId, FormEntry[]>();
  for (const e of entries) {
    const arr = byCategory.get(e.categoryId) ?? [];
    arr.push(e);
    byCategory.set(e.categoryId, arr);
  }

  return (
    <div className="max-w-3xl">
      <HeaderRow active="list" />

      {entries.length === 0 ? (
        <p className="text-sm text-gray-600">
          No folders have configured fields yet.
        </p>
      ) : (
        <div className="space-y-6">
          {Array.from(byCategory.entries()).map(([categoryId, items]) => (
            <section key={categoryId}>
              <h2 className="text-xs uppercase tracking-widest text-tal-plum-soft mb-2">
                {CATEGORY_LABELS[categoryId]}
              </h2>
              <ul className="rounded-2xl border border-tal-line bg-white divide-y divide-tal-line overflow-hidden">
                {items.map((e) => (
                  <li key={`${e.subcategoryId}:${e.pageGroup}`}>
                    <Link
                      href={e.href}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-tal-cream-soft transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-tal-plum break-all">
                          {e.subcategoryName}
                        </div>
                        <div className="text-xs text-tal-plum-soft mt-0.5 font-mono break-all">
                          {e.subcategoryId} &middot; group{" "}
                          <span className="text-tal-plum">{e.pageGroup}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs rounded-full bg-tal-cream-soft px-2 py-0.5 text-tal-plum-soft">
                          {e.fieldCount} field
                          {e.fieldCount === 1 ? "" : "s"}
                        </span>
                        <span className="text-tal-plum-soft" aria-hidden>
                          ›
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

async function PreviewView({
  activeCategory,
}: {
  activeCategory: CategoryId | null;
}) {
  const catalogue = await listAllCatalogueSubcategories();

  // One query per folder — 68 sequential round trips is fine here since the
  // route is admin-only and cached by Next between reloads.
  const questionsByFolder = new Map<string, PageQuestionRow[]>();
  await Promise.all(
    catalogue.map(async (s) => {
      const qs = await listQuestionsBySubcategory(s.id);
      questionsByFolder.set(s.id, qs);
    })
  );

  const visible = activeCategory
    ? catalogue.filter((s) => s.category_id === activeCategory)
    : catalogue;

  const byCategory = new Map<CategoryId, typeof catalogue>();
  for (const s of visible) {
    const arr = byCategory.get(s.category_id) ?? [];
    arr.push(s);
    byCategory.set(s.category_id, arr);
  }

  return (
    <div className="max-w-6xl">
      <HeaderRow active="preview" />
      <p className="text-tal-plum-soft mb-4 text-sm">
        Read-only overview of every folder and its captured fields, for review
        against the physical Adulting Life Organiser. Upload-only folders are
        marked as such.
      </p>

      <CategoryTabs active={activeCategory} />

      <div className="space-y-8">
        {Array.from(byCategory.entries()).map(([categoryId, items]) => (
          <section key={categoryId}>
            <h2 className="text-xs uppercase tracking-widest text-tal-plum-soft mb-3">
              {CATEGORY_LABELS[categoryId]}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => {
                const questions = questionsByFolder.get(s.id) ?? [];
                return (
                  <FolderCard
                    key={s.id}
                    id={s.id}
                    name={s.name}
                    categoryId={s.category_id}
                    thumbnailUrl={subcategoryThumbnail(s.id, s.category_id)}
                    questions={questions}
                    isPriority={s.is_priority}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function CategoryTabs({ active }: { active: CategoryId | null }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Link
        href="/admin/folder-forms?view=preview"
        className={
          "px-3 py-1.5 rounded-full text-xs font-medium ring-1 ring-tal-line transition " +
          (active === null
            ? "bg-black text-white ring-black"
            : "bg-white text-tal-plum-soft hover:text-tal-plum")
        }
      >
        All
      </Link>
      {CATEGORY_IDS.map((id) => {
        const isActive = active === id;
        const tint = CATEGORY_TINT[id];
        return (
          <Link
            key={id}
            href={`/admin/folder-forms?view=preview&cat=${id}`}
            className={
              "px-3 py-1.5 rounded-full text-xs font-medium ring-1 transition " +
              (isActive
                ? `${tint.tabActive} ring-transparent`
                : "bg-white text-tal-plum-soft hover:text-tal-plum ring-tal-line")
            }
          >
            {CATEGORY_LABELS[id]}
          </Link>
        );
      })}
    </div>
  );
}

function HeaderRow({ active }: { active: "list" | "preview" }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
        <h1 className="font-display text-3xl text-tal-plum">Folder forms</h1>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-tal-line overflow-hidden text-xs">
            <Link
              href="/admin/folder-forms"
              className={
                "px-3 py-1.5 " +
                (active === "list"
                  ? "bg-black text-white font-medium"
                  : "bg-white text-tal-plum-soft hover:text-tal-plum")
              }
            >
              List
            </Link>
            <Link
              href="/admin/folder-forms?view=preview"
              className={
                "px-3 py-1.5 " +
                (active === "preview"
                  ? "bg-black text-white font-medium"
                  : "bg-white text-tal-plum-soft hover:text-tal-plum")
              }
            >
              Preview
            </Link>
          </div>
          {active === "list" && (
            <Link
              href="/admin/folder-forms/new"
              className="h-9 px-3 rounded-lg bg-black text-white text-sm font-medium inline-flex items-center"
            >
              + New form
            </Link>
          )}
        </div>
      </div>
      {active === "list" && (
        <p className="text-tal-plum-soft mb-6 text-sm">
          Fields that appear on each folder&rsquo;s page form. Click a folder to
          edit its fields.
        </p>
      )}
    </>
  );
}

function FolderCard({
  id,
  name,
  categoryId,
  thumbnailUrl,
  questions,
  isPriority,
}: {
  id: string;
  name: string;
  categoryId: CategoryId;
  thumbnailUrl: string;
  questions: PageQuestionRow[];
  isPriority: boolean;
}) {
  const hasFields = questions.length > 0;
  const tint = CATEGORY_TINT[categoryId];
  const editHref = `/admin/folder-forms/${encodeURIComponent(id)}`;
  const viewHref = `/records/${categoryId}/${encodeURIComponent(id)}`;
  return (
    <div
      className={
        "group relative flex flex-col rounded-2xl ring-1 p-4 hover:shadow-md transition " +
        tint.cardBg +
        " " +
        tint.cardRing
      }
    >
      <div className="flex items-start gap-3 mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt=""
          width={40}
          height={40}
          className="w-10 h-10 rounded-xl object-cover ring-1 ring-white bg-white shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-tal-plum leading-tight break-words pr-16">
            {name}
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span
              className={
                "inline-block text-[10px] uppercase tracking-widest font-medium px-2 py-0.5 rounded-full " +
                tint.pill
              }
            >
              {CATEGORY_LABELS[categoryId]}
            </span>
            <RequiredPill subcategoryId={id} initialRequired={isPriority} />
            <span className="text-[11px] text-tal-plum-soft">
              {hasFields
                ? `${questions.length} field${questions.length === 1 ? "" : "s"}`
                : "documents only"}
            </span>
          </div>
        </div>
      </div>

      {/* Top-right action buttons: View (real user page) + Edit (admin editor). */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <Link
          href={viewHref}
          title="View real folder page"
          aria-label="View real folder page"
          className="w-8 h-8 rounded-lg bg-white/90 ring-1 ring-tal-line text-tal-plum-soft hover:text-tal-plum hover:bg-white flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </Link>
        <Link
          href={editHref}
          title="Edit fields & layout"
          aria-label="Edit fields & layout"
          className="w-8 h-8 rounded-lg bg-white/90 ring-1 ring-tal-line text-tal-plum-soft hover:text-tal-plum hover:bg-white flex items-center justify-center"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 20h4l10-10-4-4L4 16v4Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path d="M14 6l4 4" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </Link>
      </div>

      {hasFields ? (
        <div className="rounded-xl bg-white/80 ring-1 ring-white p-3 grid grid-cols-12 gap-2">
          {questions.map((q) => (
            <MiniField key={q.id} question={q} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-white/80 ring-1 ring-white p-4 text-xs text-tal-plum-soft/70 italic text-center">
          No form fields — folder is for uploading documents only.
        </div>
      )}
    </div>
  );
}

// Static col-span classes so Tailwind's JIT picks them up.
const SPAN_CLASS: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
};
const START_CLASS: Record<number, string> = {
  1: "col-start-1",
  2: "col-start-2",
  3: "col-start-3",
  4: "col-start-4",
  5: "col-start-5",
  6: "col-start-6",
  7: "col-start-7",
  8: "col-start-8",
  9: "col-start-9",
  10: "col-start-10",
  11: "col-start-11",
  12: "col-start-12",
};

function MiniField({ question }: { question: PageQuestionRow }) {
  const t = question.question_type;
  const span = SPAN_CLASS[Math.min(12, Math.max(1, question.col_span))] ?? "col-span-12";
  const start = question.col_start > 1
    ? START_CLASS[Math.min(12, Math.max(1, question.col_start))] ?? ""
    : "";
  return (
    <div className={`${span} ${start}`}>
      <div className="text-[10px] font-medium text-tal-plum-soft uppercase tracking-wider mb-0.5 truncate">
        {question.label}
        <span className="ml-1 normal-case tracking-normal text-tal-plum-soft/60 font-normal">
          ({t})
        </span>
      </div>
      {t === "textarea" ? (
        <div className="h-8 rounded-md bg-tal-cream-soft/70 ring-1 ring-tal-line/60" />
      ) : t === "dropdown" ? (
        <div className="h-5 rounded-md bg-white ring-1 ring-tal-line/60 flex items-center justify-end px-1 text-[10px] text-tal-plum-soft/60">
          ▾
        </div>
      ) : t === "date" || t === "datetime" ? (
        <div className="h-5 rounded-md bg-white ring-1 ring-tal-line/60 flex items-center px-1.5 text-[10px] text-tal-plum-soft/40 truncate">
          {t === "datetime" ? "yyyy-mm-dd hh:mm" : "yyyy-mm-dd"}
        </div>
      ) : t === "int" || t === "number" ? (
        <div className="h-5 rounded-md bg-white ring-1 ring-tal-line/60" />
      ) : t === "address" ? (
        <div className="h-10 rounded-md bg-tal-cream-soft/70 ring-1 ring-tal-line/60" />
      ) : t === "image" ? (
        <div className="h-8 rounded-md bg-tal-cream-soft/70 ring-1 ring-dashed ring-tal-line/60" />
      ) : (
        // text default
        <div className="h-5 rounded-md bg-white ring-1 ring-tal-line/60" />
      )}
    </div>
  );
}
