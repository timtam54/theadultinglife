import { GuardedLink as Link } from "@/components/GuardedLink";
import { CORE_ATTR_LABELS } from "@/lib/core-attrs";
import type { MirrorableUserAttr, UserRow } from "@/lib/db/types";

/** Read-only strip of the core (user-profile) values a folder pulls in
 *  rather than storing itself. Edited in Family Members, never here. */
export function CoreDataPanel({
  attrs,
  user,
}: {
  attrs: MirrorableUserAttr[];
  user: UserRow;
}) {
  if (attrs.length === 0) return null;
  return (
    <div className="mb-6 rounded-2xl border border-tal-line bg-tal-cream-soft/60 p-4">
      <div className="grid grid-cols-12 gap-4">
        {attrs.map((attr) => {
          const raw = user[attr];
          const value = raw == null ? "" : String(raw).trim();
          return (
            <div key={attr} className="col-span-12 sm:col-span-6">
              <div className="block text-xs uppercase tracking-wider text-tal-plum-soft mb-1">
                {CORE_ATTR_LABELS[attr]}
              </div>
              <div
                className={`min-h-11 px-4 py-2.5 rounded-xl border border-tal-line bg-tal-cream-soft ${
                  value ? "text-tal-plum" : "text-tal-plum-soft"
                }`}
              >
                {value || "Not set"}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-tal-plum-soft mt-3 flex items-center gap-1 flex-wrap">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 9v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1" fill="currentColor" />
        </svg>
        From core data · read-only here ·
        <Link
          href="/records/personal/personal.family_members"
          className="underline hover:text-tal-plum"
        >
          edit in Family Members
        </Link>
      </div>
    </div>
  );
}
