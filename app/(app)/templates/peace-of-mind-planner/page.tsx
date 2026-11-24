import type { Metadata } from "next";
import { Suspense } from "react";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { requireSession } from "@/lib/auth/session";
import {
  PLANNER_SECTIONS,
  sectionsByGroup,
} from "@/lib/templates/peace-of-mind-v2";
import { countRecordsBySubcategory } from "@/lib/services/planner";
import { createServiceClient } from "@/lib/supabase/server";
import { findUserById, listUsersInFamilyGroup } from "@/lib/db/users";
import { PlannerTourLauncher } from "@/components/tour/PlannerTourLauncher";
import { bannerThumbnail } from "@/lib/thumbnails";
import { PdfActions } from "@/components/PdfActions";

export const metadata: Metadata = {
  title: "Peace of Mind Planner",
  description:
    "Your Peace of Mind Planner — the things your family would need to know.",
};

export default async function PeaceOfMindPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ sharedBy?: string }>;
}) {
  const session = await requireSession();
  const { sharedBy: sharedByParam } = await searchParams;

  const organiserSubIds = PLANNER_SECTIONS.filter(
    (s) => s.kind === "organiser" && s.organiserSubcategoryId
  ).map((s) => s.organiserSubcategoryId as string);

  // Own records in each organiser-fed subcategory.
  const recordCounts = await countRecordsBySubcategory(
    session.user.id,
    organiserSubIds
  );

  // Grants received by this viewer, per subcategory (any item kind counts).
  const supabase = createServiceClient();
  const { data: grantRows } = await supabase
    .from("item_access_grants")
    .select("subcategory_id, item_kind, item_id, owner_user_id")
    .eq("grantee_user_id", session.user.id);
  const allGrants = (grantRows ?? []) as {
    subcategory_id: string | null;
    item_kind: string;
    item_id: string;
    owner_user_id: string;
  }[];
  // The people who've shared with this viewer — each gets a "print it all"
  // link to their shared items as one Planner document, and a "Shared by"
  // filter pill.
  const sharerIds = Array.from(new Set(allGrants.map((g) => g.owner_user_id)));
  const sharers = (await Promise.all(sharerIds.map((id) => findUserById(id))))
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .map((u) => ({
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.name || u.email || "Someone",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const sharerName = new Map(sharers.map((p) => [p.id, p.name]));

  // "Shared by" filter — only honoured when it names someone who has
  // actually shared with this viewer. Carried into section links.
  const sharedBy =
    sharedByParam && sharerName.has(sharedByParam) ? sharedByParam : null;
  const sharedByQuery = sharedBy
    ? `?sharedBy=${encodeURIComponent(sharedBy)}`
    : "";
  const grants = sharedBy
    ? allGrants.filter((g) => g.owner_user_id === sharedBy)
    : allGrants;

  // Per subcategory (organiser sections) or planner editor (planner-only
  // sections), how many items each sharer has shared with this viewer.
  const grantCounts = new Map<string, Map<string, number>>();
  const plannerOnlyCounts = new Map<string, Map<string, number>>();
  function bump(
    into: Map<string, Map<string, number>>,
    key: string,
    ownerId: string
  ) {
    const byOwner = into.get(key) ?? new Map<string, number>();
    byOwner.set(ownerId, (byOwner.get(ownerId) ?? 0) + 1);
    into.set(key, byOwner);
  }
  for (const g of grants) {
    if (g.subcategory_id) {
      bump(grantCounts, g.subcategory_id, g.owner_user_id);
    } else {
      // Planner-only grant (letters / apologies / wishes / last-words).
      // The item kind (plus the audience for wishes) says which section.
      const editor =
        g.item_kind === "planner_letter"
          ? "letters"
          : g.item_kind === "planner_apology"
            ? "apologies"
            : g.item_kind === "planner_last_words"
              ? "last-words"
              : g.item_kind === "planner_wish"
                ? `wishes-${g.item_id}`
                : null;
      if (editor) bump(plannerOnlyCounts, editor, g.owner_user_id);
    }
  }
  // Total shared items + "shared by" names for one section row.
  function sharedSummary(byOwner: Map<string, number> | undefined) {
    if (!byOwner) return { count: 0, names: [] as string[] };
    let count = 0;
    for (const n of byOwner.values()) count += n;
    const names = Array.from(byOwner.keys())
      .map((id) => sharerName.get(id) ?? "Someone")
      .sort((a, b) => a.localeCompare(b));
    return { count, names };
  }
  function sectionShared(s: (typeof PLANNER_SECTIONS)[number]) {
    if (s.kind === "organiser" && s.organiserSubcategoryId) {
      return sharedSummary(grantCounts.get(s.organiserSubcategoryId));
    }
    if (s.kind === "planner-only" && s.plannerEditor) {
      return sharedSummary(plannerOnlyCounts.get(s.plannerEditor));
    }
    return { count: 0, names: [] as string[] };
  }
  const visibleSharers = sharedBy
    ? sharers.filter((p) => p.id === sharedBy)
    : sharers;

  // Per-planner-only-section owner content: letters + apologies + last-words
  // are one row per user (or zero), wishes are keyed by audience. We use these
  // to hide empty planner-only sections just like empty organiser sections.
  const [
    { count: ownLetters },
    { count: ownApologies },
    { count: ownLastWords },
    { data: ownWishRows },
  ] = await Promise.all([
    supabase
      .from("planner_letters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id),
    supabase
      .from("planner_apologies")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id),
    supabase
      .from("planner_last_words")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id),
    supabase
      .from("planner_wishes")
      .select("audience, body")
      .eq("user_id", session.user.id),
  ]);
  const ownWishAudiences = new Set(
    ((ownWishRows as { audience: string; body: string | null }[]) ?? [])
      .filter((r) => (r.body ?? "").trim().length > 0)
      .map((r) => r.audience)
  );

  // My Personal Information / Family Members read the Family Members roster.
  const familyCount = (await listUsersInFamilyGroup(session.user.familyGroupId)).length;

  // Whether a specific planner-only section has any own content for this
  // viewer. Called during the section filter below.
  function ownContentForPlannerOnly(editor: string | undefined): boolean {
    if (!editor) return false;
    if (editor === "people-self") return true;
    if (editor === "people-family") return familyCount > 1;
    if (editor === "letters") return (ownLetters ?? 0) > 0;
    if (editor === "apologies") return (ownApologies ?? 0) > 0;
    if (editor === "last-words") return (ownLastWords ?? 0) > 0;
    if (editor.startsWith("wishes-")) {
      return ownWishAudiences.has(editor.slice("wishes-".length));
    }
    return false;
  }

  const groups = sectionsByGroup();
  const groupOrder = Array.from(groups.keys());

  return (
    <div>
      <div className="text-sm text-tal-plum-soft mb-1">
        <Link href="/dashboard" className="hover:text-tal-plum">
          Dashboard
        </Link>
      </div>
      <h1
        data-tour="planner-index"
        className="font-display text-3xl text-tal-plum mb-2"
      >
        Peace of Mind Planner
      </h1>
      <p className="text-tal-plum-soft mb-6 max-w-2xl">
        The things your family would need to know if something happened to you.
        Shared sections show the same data as your Organiser — add, edit or
        delete from either view.
      </p>

      {/* "Shared by" filter — limits the shared items below (section
          counts and, via ?sharedBy=, the entries inside a section) to one
          person. Only shown when something has been shared with you. */}
      {sharers.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-tal-plum">
            Shared by:
          </span>
          <SharerPill
            href="/templates/peace-of-mind-planner"
            active={!sharedBy}
          >
            All
          </SharerPill>
          {sharers.map((p) => (
            <SharerPill
              key={p.id}
              href={`/templates/peace-of-mind-planner?sharedBy=${encodeURIComponent(p.id)}`}
              active={sharedBy === p.id}
            >
              {p.name}
            </SharerPill>
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <PdfActions
          downloadUrl="/api/export/doc?kind=planner"
          shareUrl="/api/export/doc/email"
          shareBody={{ kind: "planner" }}
          shareLabel="Your Peace of Mind Planner (PDF), made by The Adulting Life"
          what="the whole Planner"
        />
        <span className="text-xs text-tal-plum-soft">
          One document, in the same order as the printed Planner — to keep somewhere safe.
        </span>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bannerThumbnail("planner")}
        alt=""
        width={1600}
        height={397}
        className="mb-6 w-full max-w-3xl aspect-[4/1] rounded-2xl border border-tal-line object-cover"
      />

      {allGrants.length > 0 && (
        <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
          <div className="text-sm font-medium text-violet-900 mb-1">
            Shared with you
          </div>
          <div className="text-xs text-violet-900/80">
            Other Adulting Life users have shared items with you. Open any
            section below marked{" "}
            <span className="font-semibold">Shared</span> to see what they
            shared.
          </div>
          {visibleSharers.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {visibleSharers.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-violet-900">
                    Everything {p.name} has shared with you:
                  </span>
                  <PdfActions
                    downloadUrl={`/api/export/doc?kind=planner-shared&from=${encodeURIComponent(p.id)}`}
                    shareUrl="/api/export/doc/email"
                    shareBody={{ kind: "planner-shared", from: p.id }}
                    shareLabel={`What ${p.name} shared with you (PDF)`}
                    what={`everything ${p.name} has shared with you`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {groupOrder.map((group) => {
          const allSections = groups.get(group) ?? [];
          // Always hide sections that are empty for this viewer. An empty
          // Planner row that leads nowhere useful is noise — the user gets
          // to add content from the Organiser side (folders are always
          // discoverable there) so this page should only show what's
          // actually filled in or shared.
          const sections = allSections.filter((s) => {
            const shared = sectionShared(s).count;
            if (s.kind === "organiser" && s.organiserSubcategoryId) {
              const own = recordCounts.get(s.organiserSubcategoryId) ?? 0;
              return own > 0 || shared > 0;
            }
            if (s.kind === "planner-only") {
              // Planner-only grants have subcategory_id = null; their item
              // kind (and audience, for wishes) maps them to a section.
              return ownContentForPlannerOnly(s.plannerEditor) || shared > 0;
            }
            return false;
          });
          // Whole group might collapse to zero visible sections; skip it.
          if (sections.length === 0) return null;
          return (
            <section key={group}>
              <h2 className="font-display text-lg text-tal-plum mb-2">
                {group}
              </h2>
              <ul className="space-y-2">
                {sections.map((s) => {
                  const recordCount =
                    s.kind === "organiser" && s.organiserSubcategoryId
                      ? (recordCounts.get(s.organiserSubcategoryId) ?? 0)
                      : 0;
                  const { count: sharedCount, names: sharedNames } =
                    sectionShared(s);
                  const sharedPill =
                    sharedCount > 0 ? (
                      <span
                        className="text-[10px] uppercase tracking-wider font-semibold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full"
                        title={`${sharedCount} item${sharedCount === 1 ? "" : "s"} shared with you by ${sharedNames.join(", ")}`}
                      >
                        {sharedCount} shared by {sharedNames.join(", ")}
                      </span>
                    ) : null;
                  const tourAnchor =
                    s.slug === "letters"
                      ? "planner-section-letters"
                      : s.slug === "bank-accounts"
                        ? "planner-shared-sections"
                        : undefined;
                  return (
                    <li key={s.slug} data-tour={tourAnchor}>
                      <Link
                        href={`/templates/peace-of-mind-planner/${s.slug}${sharedByQuery}`}
                        className="tal-hover-card flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            aria-hidden
                            className={
                              "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs " +
                              (s.kind === "organiser"
                                ? "bg-tal-cream-soft text-tal-plum ring-1 ring-tal-line"
                                : "bg-white text-tal-plum-soft ring-1 ring-dashed ring-tal-line")
                            }
                            title={
                              s.kind === "organiser"
                                ? "Shared with Organiser"
                                : "Planner-only"
                            }
                          >
                            {s.kind === "organiser" ? "↔" : "◇"}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-tal-plum">
                              {s.title}
                            </div>
                            {s.hint && (
                              <div className="text-xs text-tal-plum-soft mt-0.5">
                                {s.hint}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {s.kind === "organiser" ? (
                            <div className="flex items-center gap-2">
                              <span
                                className={
                                  "text-xs " +
                                  (recordCount > 0
                                    ? "text-green-700"
                                    : "text-tal-plum-soft")
                                }
                              >
                                {recordCount > 0
                                  ? `${recordCount} ${recordCount === 1 ? "entry" : "entries"}`
                                  : "No entries yet"}
                              </span>
                              {sharedPill}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-tal-plum-soft">
                                Planner-only
                              </span>
                              {sharedPill}
                            </div>
                          )}
                          <span className="text-sm text-tal-plum-soft">→</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      {/* Planner-specific interactive tour — opt-in only. Fires when the
          user clicks the compass FAB or the "Replay Planner tour" button
          in Settings (both push ?planner-tour=start). We deliberately do
          NOT auto-launch on every visit — that was annoying and the
          floating tour button on the layout is discoverable enough. */}
      <Suspense fallback={null}>
        <PlannerTourLauncher shouldAutoLaunch={false} />
      </Suspense>
    </div>
  );
}

// "Shared by" filter pill — same look as the Learn filter pills.
function SharerPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center h-8 px-3 rounded-full text-xs font-medium border transition " +
        (active
          ? "bg-black text-white border-tal-plum"
          : "bg-white text-tal-plum-soft border-tal-line hover:border-tal-plum hover:text-tal-plum")
      }
    >
      {children}
    </Link>
  );
}
