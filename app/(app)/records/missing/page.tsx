import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { requireSession } from "@/lib/auth/session";
import {
  getPrioritySubcategoryIds,
  listHiddenSuggestionsForUser,
  listMissingFoldersForFamily,
} from "@/lib/services/folder-completion";
import { CATEGORY_LABELS } from "@/lib/db/types";
import { MissingFolderMenu } from "@/components/MissingFolderMenu";
import { HiddenSuggestions } from "@/components/HiddenSuggestions";
import { truncateForRow } from "@/lib/ui/truncate";

export const metadata: Metadata = { title: "Next things to complete" };

export default async function MissingFoldersPage() {
  const session = await requireSession();
  const [items, hiddenSuggestions, prioritySet] = await Promise.all([
    listMissingFoldersForFamily(
      session.user.familyGroupId,
      session.user.id,
      500
    ),
    listHiddenSuggestionsForUser(session.user.id),
    getPrioritySubcategoryIds(),
  ]);

  const hiddenItems = hiddenSuggestions.map((h) => ({
    subcategoryId: h.subcategoryId,
    name: h.name,
    categoryLabel: CATEGORY_LABELS[h.categoryId],
    dismissedUntil: h.dismissedUntil,
  }));

  return (
    <div>
      <header className="rounded-2xl bg-tal-cream-soft border border-tal-line px-5 py-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-2xl text-tal-plum leading-tight">
            Next things to complete
          </h1>
          <span className="text-tal-plum-soft/50" aria-hidden>·</span>
          <p className="text-tal-plum-soft text-sm">
            Every folder that&rsquo;s still empty or half-done.
          </p>
          <div className="ml-auto">
            <Link
              href="/records"
              className="h-9 px-3 rounded-lg border border-tal-line bg-white text-sm text-tal-plum-soft hover:text-tal-plum inline-flex items-center"
            >
              ← Back to Life Admin
            </Link>
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
          <h2 className="font-display text-lg text-tal-plum mb-1">
            Nothing missing 🎉
          </h2>
          <p className="text-sm text-tal-plum-soft">
            Every folder has something in it. Nice work.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-tal-line bg-white p-5">
          <p className="text-xs text-tal-plum-soft mb-3">
            Priority folders (emergency-critical) can&rsquo;t be dismissed. Everything else can be snoozed or marked &ldquo;Not applicable&rdquo; from the &hellip; menu.
          </p>
          <ul className="space-y-2">
            {items.map((f) => (
              <li
                key={f.subcategoryId}
                className="flex items-center gap-2 rounded-xl border border-tal-line bg-white p-3 hover:shadow-sm"
              >
                <Link
                  href={f.href}
                  className="flex items-center justify-between gap-3 flex-1 min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-tal-plum break-all" title={f.name}>
                      {truncateForRow(f.name, 40)}
                    </div>
                    <div className="text-xs text-tal-plum-soft">
                      {CATEGORY_LABELS[f.categoryId]}
                    </div>
                    {f.reason && (
                      <div className="text-xs text-tal-plum-soft/90 mt-1 italic">
                        {f.reason}
                      </div>
                    )}
                  </div>
                  <span
                    className={
                      "text-xs rounded-full px-2 py-0.5 shrink-0 " +
                      (f.state === "started"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-tal-cream text-tal-plum-soft")
                    }
                  >
                    {f.state === "started" ? "In progress" : "Not started"}
                  </span>
                </Link>
                {!prioritySet.has(f.subcategoryId) && (
                  <MissingFolderMenu subcategoryId={f.subcategoryId} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <HiddenSuggestions items={hiddenItems} />
    </div>
  );
}
