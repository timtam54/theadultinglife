import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listSubcategoriesByTemplateGroup } from "@/lib/db/subcategories";
import { countInstancesBySubcategory } from "@/lib/db/responses";
import { listUsersInFamilyGroup } from "@/lib/db/users";
import { UserPicker } from "@/components/UserPicker";
import { pomSlugFromSubcategoryId } from "@/lib/templates/peace-of-mind";

export const metadata: Metadata = {
  title: "Peace of Mind Planner",
  description:
    "Fill each Peace of Mind section — your answers save into the right Life Admin folder.",
};

function cleanName(name: string): string {
  return name.replace(/^TAL\s*[—-]\s*/, "");
}

export default async function PeaceOfMindPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const session = await requireSession();
  const familyUsers = await listUsersInFamilyGroup(session.user.familyGroupId);

  const { user: userParam } = await searchParams;
  const requested = userParam?.trim();
  const targetUserId =
    requested && familyUsers.some((u) => u.id === requested)
      ? requested
      : session.user.id;

  const sections = await listSubcategoriesByTemplateGroup("peace_of_mind");
  const counts = await countInstancesBySubcategory(
    targetUserId,
    sections.map((s) => s.id)
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div className="text-sm text-tal-plum-soft">
          <Link href="/templates" className="hover:text-tal-plum">
            Document Templates
          </Link>
        </div>
        {familyUsers.length > 1 && (
          <>
            <span className="text-sm text-tal-plum-soft">·</span>
            <UserPicker
              users={familyUsers.map((u) => ({
                id: u.id,
                first_name: u.first_name,
                last_name: u.last_name,
                email: u.email,
                member_kind: u.member_kind,
                is_primary: u.is_primary,
              }))}
              currentUserId={targetUserId}
            />
          </>
        )}
      </div>
      <h1 className="font-display text-3xl text-tal-plum mb-2">
        Peace of Mind Planner
      </h1>
      <p className="text-tal-plum-soft mb-8">
        Fill each section below. Your answers file into the matching Life Admin
        folder — you can keep adding entries over time.
      </p>

      <ul className="space-y-2">
        {sections.map((s) => {
          const slug = pomSlugFromSubcategoryId(s.id);
          if (!slug) return null;
          const count = counts.get(s.id) ?? 0;
          const filled = count > 0;
          return (
            <li key={s.id}>
              <Link
                href={`/templates/peace-of-mind-planner/${slug}`}
                className="flex items-center justify-between rounded-xl border border-tal-line bg-white px-4 py-3 hover:shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusBadge filled={filled} />
                  <div className="min-w-0">
                    <div className="font-medium text-tal-plum">
                      {cleanName(s.name)}
                    </div>
                    {s.hint && (
                      <div className="text-xs text-tal-plum-soft mt-0.5">
                        {s.hint}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={
                      "text-xs " +
                      (filled ? "text-green-700" : "text-tal-plum-soft")
                    }
                  >
                    {filled
                      ? `${count} ${count === 1 ? "entry" : "entries"}`
                      : "No entries yet"}
                  </span>
                  <span className="text-sm text-tal-plum-soft">→</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusBadge({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <span
        aria-label="Section has entries"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 12l4 4 10-10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span
      aria-label="Section is empty"
      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-tal-line text-tal-plum-soft"
    />
  );
}
