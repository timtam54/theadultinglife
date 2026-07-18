import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { buildEmergencyView } from "@/lib/services/emergency";
import type { RecordField } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "In case of emergency",
  description: "Everything you'd want to hand to a paramedic, hospital, or trusted person in an emergency.",
};

const CATEGORY_TONE: Record<
  "personal" | "health" | "admin",
  { chip: string; bar: string }
> = {
  personal: { chip: "bg-violet-100 text-violet-800", bar: "bg-violet-500" },
  health: { chip: "bg-amber-100 text-amber-800", bar: "bg-amber-500" },
  admin: { chip: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-600" },
};

function renderField(f: RecordField): string {
  if (!f.value) return "";
  if (f.type === "date") {
    const d = new Date(f.value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }
  return f.value;
}

export default async function EmergencyPage() {
  const session = await requireSession();
  const { sections, totalRecords, users } = await buildEmergencyView(
    session.user.familyGroupId
  );
  const filledSections = sections.filter((s) => s.records.length > 0);
  const emptySections = sections.filter((s) => s.records.length === 0);

  return (
    <div>
      <div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
        <Link
          href="/dashboard"
          className="text-tal-plum-soft hover:text-tal-plum transition-colors"
        >
          Dashboard
        </Link>
        <span className="text-tal-plum-soft/50" aria-hidden>/</span>
        <span className="text-tal-plum-soft">Emergency</span>
      </div>

      <div className="rounded-2xl bg-red-600 text-white px-6 py-4 mb-6 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/20 shrink-0"
            aria-hidden
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2 3 20h18L12 2Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="17" r="1.1" fill="currentColor" />
            </svg>
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
            In case of emergency
          </span>
          <h1 className="font-display text-2xl leading-tight">
            Everything a paramedic, hospital or trusted person might need
          </h1>
          <span className="text-white/40 mx-1" aria-hidden>·</span>
          <span className="text-sm text-white/85">
            {totalRecords} record{totalRecords === 1 ? "" : "s"} across{" "}
            {users.length} family member{users.length === 1 ? "" : "s"}
          </span>
          <a
            href="/emergency/print"
            target="_blank"
            rel="noopener"
            className="ml-auto h-8 px-3 rounded-xl bg-white text-red-700 text-xs font-medium hover:bg-white/90 inline-flex items-center gap-1"
          >
            Print / Save as PDF
          </a>
        </div>
      </div>

      {totalRecords === 0 && (
        <section className="rounded-2xl border border-dashed border-tal-line bg-white p-8 text-center">
          <p className="text-tal-plum-soft">
            No emergency-relevant records yet. Fill in these folders so this
            page has something to show:
          </p>
          <ul className="mt-4 flex flex-wrap gap-2 justify-center">
            {sections.slice(0, 6).map((s) => (
              <li key={s.subcategoryId}>
                <Link
                  href={`/records/${s.category}/${encodeURIComponent(s.subcategoryId)}`}
                  className="inline-block px-3 py-1 rounded-full border border-tal-line bg-tal-cream-soft text-sm text-tal-plum hover:shadow-sm"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {filledSections.length > 0 && (
        <div className="space-y-6">
          {filledSections.map((section) => {
            const tone = CATEGORY_TONE[section.category];
            return (
              <section
                key={section.subcategoryId}
                className="rounded-2xl border border-tal-line bg-white overflow-hidden shadow-sm"
              >
                <div className="flex items-center gap-3 px-5 py-3 border-b border-tal-line bg-tal-cream-soft/50">
                  <span
                    className={
                      "inline-flex items-center justify-center w-8 h-8 rounded-lg text-white shrink-0 " +
                      tone.bar
                    }
                    aria-hidden
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2a1.5 1.5 0 0 1 1.05.43l1.32 1.29c.28.27.66.43 1.05.43H19.5A1.5 1.5 0 0 1 21 8.65v9.35a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6.5Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <h2 className="font-display text-lg text-tal-plum">
                    {section.label}
                  </h2>
                  <span
                    className={
                      "text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-widest " +
                      tone.chip
                    }
                  >
                    {section.records.length}
                  </span>
                  <Link
                    href={`/records/${section.category}/${encodeURIComponent(section.subcategoryId)}`}
                    className="ml-auto text-xs text-tal-plum-soft hover:text-tal-plum hover:underline"
                  >
                    Edit →
                  </Link>
                </div>
                <ul className="divide-y divide-tal-line">
                  {section.records.map((r) => (
                    <li key={r.id} className="p-4">
                      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1.5">
                        <div className="font-medium text-tal-plum">
                          {r.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-tal-plum-soft">
                          <span>{r.userName}</span>
                          {r.expiryDate && (
                            <>
                              <span aria-hidden>·</span>
                              <span>
                                Expires{" "}
                                {new Date(r.expiryDate).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {r.fields && r.fields.length > 0 && (
                        <dl className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5 text-sm">
                          {r.fields
                            .filter((f) => f.value)
                            .map((f) => (
                              <div key={f.key} className="contents">
                                <dt className="text-tal-plum-soft">
                                  {f.label}
                                </dt>
                                <dd className="text-tal-plum">
                                  {renderField(f)}
                                </dd>
                              </div>
                            ))}
                        </dl>
                      )}
                      {r.notes && (
                        <p className="text-xs text-tal-plum-soft mt-2 whitespace-pre-line">
                          {r.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {emptySections.length > 0 && totalRecords > 0 && (
        <section className="mt-8 rounded-2xl border border-dashed border-tal-line bg-white p-5">
          <h2 className="font-display text-lg text-tal-plum mb-1">
            Still missing
          </h2>
          <p className="text-sm text-tal-plum-soft mb-3">
            These folders have no records yet. Filling them makes this page
            more useful in an emergency.
          </p>
          <ul className="flex flex-wrap gap-2">
            {emptySections.map((s) => (
              <li key={s.subcategoryId}>
                <Link
                  href={`/records/${s.category}/${encodeURIComponent(s.subcategoryId)}`}
                  className="inline-block px-3 py-1 rounded-full border border-tal-line bg-tal-cream-soft text-sm text-tal-plum hover:shadow-sm"
                >
                  {s.label} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
