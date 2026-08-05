import type { Metadata } from "next";
import { GuardedLink as Link } from "@/components/GuardedLink";
import { requireSession } from "@/lib/auth/session";
import { CustomReminderForm } from "@/components/CustomReminderForm";
import { listRecords } from "@/lib/db/records";
import { CATEGORY_LABELS } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "New custom reminder",
  description:
    "Add a reminder for anything with a date — a service, appointment, renewal or errand.",
};

export default async function NewCustomReminderPage() {
  const session = await requireSession();
  const records = await listRecords(session.user.id);
  const recordOptions = records.map((r) => ({
    id: r.id,
    title: r.title,
    categoryLabel: CATEGORY_LABELS[r.category_id],
  }));

  return (
    <div>
      <div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
        <Link
          href="/reminders"
          className="text-tal-plum-soft hover:text-tal-plum"
        >
          Reminders
        </Link>
        <span className="text-tal-plum-soft/50" aria-hidden>/</span>
        <Link
          href="/reminders/new"
          className="text-tal-plum-soft hover:text-tal-plum"
        >
          Add a reminder
        </Link>
        <span className="text-tal-plum-soft/50" aria-hidden>/</span>
        <span className="text-tal-plum-soft">Custom</span>
      </div>

      <header className="rounded-2xl bg-black text-white px-6 py-4 mb-6 shadow-md">
        <h1 className="font-display text-2xl leading-tight">
          Custom reminder
        </h1>
        <p className="text-sm text-white/80 mt-1">
          For anything that isn&apos;t in Life Admin yet — a service booking, an
          errand, a renewal date. We&apos;ll send a push 7 days before.
        </p>
      </header>

      <CustomReminderForm records={recordOptions} />
    </div>
  );
}
