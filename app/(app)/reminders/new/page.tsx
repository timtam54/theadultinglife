import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listRecords } from "@/lib/db/records";
import type { CategoryId, RecordRow } from "@/lib/db/types";
import { CATEGORY_LABELS } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "Add a reminder",
  description:
    "Pick something to add an expiry to. The reminder lives with the document, so you can always find it again.",
};

// Curated list of the things people most commonly want reminders for.
// Each row points at an existing subcategory in Life Admin.
interface Renewable {
  subcategoryId: string;
  label: string;
  categoryId: CategoryId;
}

const RENEWABLES: readonly Renewable[] = [
  { subcategoryId: "personal.passport_travel", label: "Passport", categoryId: "personal" },
  { subcategoryId: "personal.licences_ids", label: "Driver's licence & IDs", categoryId: "personal" },
  { subcategoryId: "personal.vehicle_details", label: "Car registration", categoryId: "personal" },
  { subcategoryId: "admin.vehicle_insurance", label: "Vehicle insurance", categoryId: "admin" },
  { subcategoryId: "admin.home_insurance", label: "Home insurance", categoryId: "admin" },
  { subcategoryId: "health.health_insurance", label: "Health insurance", categoryId: "health" },
  { subcategoryId: "health.life_insurance", label: "Life insurance", categoryId: "health" },
  { subcategoryId: "admin.rental_agreements", label: "Rental agreement", categoryId: "admin" },
  { subcategoryId: "admin.warranties", label: "Warranty", categoryId: "admin" },
  { subcategoryId: "admin.telephone_devices", label: "Phone / device contract", categoryId: "admin" },
  { subcategoryId: "admin.electricity_gas", label: "Electricity or gas plan", categoryId: "admin" },
];

const CATEGORY_TONE: Record<CategoryId, { bg: string; text: string; bar: string }> = {
  personal: { bg: "bg-violet-50 ring-violet-100", text: "text-violet-800", bar: "bg-violet-500" },
  health:   { bg: "bg-amber-50 ring-amber-100",   text: "text-amber-800",  bar: "bg-amber-500" },
  education:{ bg: "bg-sky-50 ring-sky-100",       text: "text-sky-800",    bar: "bg-sky-500" },
  employment:{bg: "bg-rose-50 ring-rose-100",     text: "text-rose-800",   bar: "bg-rose-500" },
  admin:    { bg: "bg-emerald-50 ring-emerald-100",text:"text-emerald-800", bar: "bg-emerald-500" },
};

export default async function AddReminderPage() {
  const session = await requireSession();
  const records = await listRecords(session.user.id);

  // For each renewable, find matching records the user already has,
  // sorted so the most-imminent expiry surfaces first.
  const byId = new Map<string, RecordRow[]>();
  for (const r of records) {
    if (!r.subcategory_id) continue;
    const list = byId.get(r.subcategory_id) ?? [];
    list.push(r);
    byId.set(r.subcategory_id, list);
  }

  const rowsWithState = RENEWABLES.map((item) => {
    const matches = byId.get(item.subcategoryId) ?? [];
    const withDate = matches
      .filter((m) => m.expiry_date)
      .sort((a, b) =>
        (a.expiry_date ?? "").localeCompare(b.expiry_date ?? "")
      );
    const withoutDate = matches.filter((m) => !m.expiry_date);
    return {
      ...item,
      hasRecords: matches.length > 0,
      recordsWithDate: withDate,
      recordsWithoutDate: withoutDate,
    };
  });

  return (
    <div>
      <div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
        <Link
          href="/reminders"
          className="text-tal-plum-soft hover:text-tal-plum transition-colors"
        >
          Reminders
        </Link>
        <span className="text-tal-plum-soft/50" aria-hidden>/</span>
        <span className="text-tal-plum-soft">Add a reminder</span>
      </div>

      <header className="rounded-2xl bg-gradient-to-br from-tal-plum to-tal-plum-dark text-white px-6 py-5 mb-6 shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium tracking-wider uppercase shrink-0">
            Reminders
          </span>
          <h1 className="font-display text-2xl leading-tight">
            Add a reminder
          </h1>
        </div>
        <p className="text-sm text-white/80 mt-2 max-w-2xl">
          Pick something to add an expiry to. Reminders live with the document
          they belong to, so you can always find them again.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {rowsWithState.map((row) => {
          const tone = CATEGORY_TONE[row.categoryId];
          const nextDate = row.recordsWithDate[0]?.expiry_date ?? null;
          const state: "no_record" | "missing_date" | "has_date" =
            !row.hasRecords
              ? "no_record"
              : row.recordsWithDate.length === 0
                ? "missing_date"
                : "has_date";
          const targetHref =
            state === "no_record"
              ? `/records/${row.categoryId}/new?subcategory=${row.subcategoryId}`
              : state === "missing_date"
                ? `/records/${row.categoryId}/r/${row.recordsWithoutDate[0].id}`
                : `/records/${row.categoryId}/${row.subcategoryId}`;
          const cta =
            state === "no_record"
              ? "Add record + date"
              : state === "missing_date"
                ? "Add date"
                : "Update date";
          return (
            <li key={row.subcategoryId}>
              <Link
                href={targetHref}
                className={
                  "group flex items-center gap-4 rounded-2xl ring-1 p-4 hover:shadow-md hover:-translate-y-0.5 transition " +
                  tone.bg
                }
              >
                <span
                  className={
                    "inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white shrink-0 " +
                    tone.text
                  }
                  aria-hidden
                >
                  <CalendarIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-tal-plum leading-tight">
                    {row.label}
                  </div>
                  <div className="text-xs text-tal-plum-soft mt-0.5">
                    {CATEGORY_LABELS[row.categoryId]} ·{" "}
                    {state === "no_record"
                      ? "Not added yet"
                      : state === "missing_date"
                        ? "No expiry set"
                        : `Expires ${formatDate(nextDate!)}`}
                  </div>
                </div>
                <span
                  className={
                    "inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-white text-xs font-medium shrink-0 " +
                    tone.text +
                    " group-hover:shadow-sm"
                  }
                >
                  {cta} →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <section className="mt-6 rounded-2xl border border-tal-line bg-white p-5 flex items-center gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-tal-plum">
            Something else you want to track?
          </div>
          <p className="text-xs text-tal-plum-soft mt-0.5">
            Browse all Life Admin categories and add an expiry to any record.
          </p>
        </div>
        <Link
          href="/records"
          className="h-10 px-4 rounded-lg border border-tal-line bg-tal-cream-soft text-sm text-tal-plum hover:shadow-sm inline-flex items-center gap-1"
        >
          Browse all records →
        </Link>
      </section>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M3.5 10h17M8 3.5v4M16 3.5v4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
