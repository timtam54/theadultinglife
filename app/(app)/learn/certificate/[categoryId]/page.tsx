import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";
import { contentForCategory } from "@/content/learning";
import { listProgress } from "@/lib/db/progress";
import { categoryThumbnail } from "@/lib/thumbnails";

export const metadata: Metadata = {
  title: "Certificate",
  robots: { index: false, follow: false },
};

const CATEGORY_TONE: Record<
  CategoryId,
  { accent: string; soft: string; ink: string }
> = {
  personal: { accent: "border-violet-400", soft: "bg-violet-50", ink: "text-violet-700" },
  health: { accent: "border-amber-400", soft: "bg-amber-50", ink: "text-amber-700" },
  education: { accent: "border-sky-400", soft: "bg-sky-50", ink: "text-sky-700" },
  employment: { accent: "border-rose-400", soft: "bg-rose-50", ink: "text-rose-700" },
  admin: { accent: "border-emerald-500", soft: "bg-emerald-50", ink: "text-emerald-700" },
};

function isCategoryId(v: string): v is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(v);
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  if (!isCategoryId(categoryId)) notFound();

  const session = await requireSession();
  const [articles, progressRows] = await Promise.all([
    Promise.resolve(contentForCategory(categoryId)),
    listProgress(session.user.id),
  ]);

  const readIds = new Set(
    progressRows
      .filter((p) => p.item_type === "content" && p.status === "completed")
      .map((p) => p.item_id)
  );
  const allComplete =
    articles.length > 0 && articles.every((a) => readIds.has(a.id));
  if (!allComplete) notFound();

  const name =
    [session.user.firstName, session.user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Adulting Life Learner";

  const awardedOn = new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const tone = CATEGORY_TONE[categoryId];
  const label = CATEGORY_LABELS[categoryId];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link
          href="/learn"
          className="text-sm text-tal-plum-soft hover:text-tal-plum"
        >
          ← Back to Learn
        </Link>
        <PrintButton />
      </div>

      <div
        className={
          "bg-white rounded-3xl border-4 " +
          tone.accent +
          " p-10 lg:p-14 shadow-lg print:shadow-none print:border-2"
        }
      >
        <div className="text-center">
          <div className={"inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-widest " + tone.soft + " " + tone.ink}>
            Certificate of completion
          </div>

          <h1 className="font-display text-4xl lg:text-5xl text-tal-plum mt-6">
            The Adulting Life
          </h1>
          <div className="text-sm text-tal-plum-soft italic mt-1">
            Your life. Organised.
          </div>

          <div className="my-10 lg:my-12">
            <div className="text-sm uppercase tracking-widest text-tal-plum-soft mb-2">
              This certifies that
            </div>
            <div className="font-display text-3xl lg:text-4xl text-tal-plum border-b border-tal-line pb-3 max-w-xl mx-auto">
              {name}
            </div>
            <p className="mt-6 text-tal-plum-dark leading-relaxed max-w-xl mx-auto">
              has completed every lesson in the{" "}
              <strong className={tone.ink}>{label}</strong> learning path,
              earning the <strong>{label} Pro</strong> badge and demonstrating a
              solid handle on this part of adulting life.
            </p>
          </div>

          <div className="flex items-end justify-between gap-6 mt-10 flex-wrap">
            <div className="text-left">
              <div className="font-display text-lg text-tal-plum border-b border-tal-line pb-1 min-w-[10rem]">
                {awardedOn}
              </div>
              <div className="text-[11px] uppercase tracking-widest text-tal-plum-soft mt-1">
                Date awarded
              </div>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={categoryThumbnail(categoryId)}
              alt=""
              width={72}
              height={72}
              className="w-16 h-16 rounded-xl object-cover"
            />

            <div className="text-right">
              <div className="font-display italic text-lg text-tal-plum border-b border-tal-line pb-1 min-w-[10rem]">
                Donna
              </div>
              <div className="text-[11px] uppercase tracking-widest text-tal-plum-soft mt-1">
                The Adulting Life
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-tal-plum-soft mt-4 print:hidden">
        Tip: use your browser&apos;s print dialog to save as PDF.
      </p>
    </div>
  );
}

function PrintButton() {
  return (
    <form action="javascript:window.print()">
      <button
        type="submit"
        className="h-10 px-4 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark"
      >
        Print / save as PDF
      </button>
    </form>
  );
}
