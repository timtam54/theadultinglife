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

export const metadata: Metadata = {
  title: "Peace of Mind Planner",
  description:
    "Your Peace of Mind Planner — the things your family would need to know.",
};

export default async function PeaceOfMindPlannerPage() {
  const session = await requireSession();

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
    .select("subcategory_id, item_kind, owner_user_id")
    .eq("grantee_user_id", session.user.id);
  // The people who've shared with this viewer — each gets a "print it all"
  // link to their shared items as one Planner document.
  const sharerIds = Array.from(
    new Set(((grantRows ?? []) as { owner_user_id: string }[]).map((g) => g.owner_user_id))
  );
  const sharers = (await Promise.all(sharerIds.map((id) => findUserById(id))))
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .map((u) => ({
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.name || u.email || "Someone",
    }));
  const grantCounts = new Map<string, number>();
  let plannerOnlyGrants = 0;
  for (const g of (grantRows ?? []) as {
    subcategory_id: string | null;
    item_kind: string;
  }[]) {
    if (g.subcategory_id) {
      grantCounts.set(
        g.subcategory_id,
        (grantCounts.get(g.subcategory_id) ?? 0) + 1
      );
    } else {
      // Planner-only grant (letters / apologies / wishes / last-words).
      plannerOnlyGrants += 1;
    }
  }

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

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <a
          href="/planner"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-black text-white text-sm font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M7 9V4h10v5M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <rect x="7" y="14" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.7" />
          </svg>
          Print the whole Planner
        </a>
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

      {(grantCounts.size > 0 || plannerOnlyGrants > 0) && (
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
          {sharers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {sharers.map((p) => (
                <a
                  key={p.id}
                  href={`/planner/shared?from=${encodeURIComponent(p.id)}`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center h-8 px-3 rounded-lg border border-violet-300 bg-white text-xs font-medium text-violet-900 hover:bg-violet-100"
                >
                  Print everything {p.name} has shared with you
                </a>
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
            if (s.kind === "organiser" && s.organiserSubcategoryId) {
              const own = recordCounts.get(s.organiserSubcategoryId) ?? 0;
              const shared = grantCounts.get(s.organiserSubcategoryId) ?? 0;
              return own > 0 || shared > 0;
            }
            if (s.kind === "planner-only") {
              // Planner-only grants have subcategory_id = null so we can't
              // tell WHICH letter/apology/wish was shared without extra
              // queries. If ANY planner-only grants exist we keep the
              // planner-only sections so grantees can find what was
              // shared — same trade-off as before.
              return ownContentForPlannerOnly(s.plannerEditor) || plannerOnlyGrants > 0;
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
                  const sharedCount =
                    s.kind === "organiser" && s.organiserSubcategoryId
                      ? (grantCounts.get(s.organiserSubcategoryId) ?? 0)
                      : 0;
                  const tourAnchor =
                    s.slug === "letters"
                      ? "planner-section-letters"
                      : s.slug === "bank-accounts"
                        ? "planner-shared-sections"
                        : undefined;
                  return (
                    <li key={s.slug} data-tour={tourAnchor}>
                      <Link
                        href={`/templates/peace-of-mind-planner/${s.slug}`}
                        className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3 hover:shadow-sm"
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
                              {sharedCount > 0 && (
                                <span
                                  className="text-[10px] uppercase tracking-wider font-semibold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full"
                                  title={`${sharedCount} item${sharedCount === 1 ? "" : "s"} shared with you`}
                                >
                                  {sharedCount} shared
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-tal-plum-soft">
                              Planner-only
                            </span>
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
