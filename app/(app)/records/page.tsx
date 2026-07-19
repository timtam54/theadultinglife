import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { listUserRecords } from "@/lib/services/records";
import { categoryProgressForFamily } from "@/lib/services/folder-completion";
import { CATEGORY_IDS, CATEGORY_LABELS, type CategoryId } from "@/lib/db/types";

const CATEGORY_META: Record<
  CategoryId,
  {
    description: string;
    tone: {
      bg: string;
      ring: string;
      iconBg: string;
      iconText: string;
      bar: string;
      pill: string;
    };
    icon: React.ReactNode;
  }
> = {
  personal: {
    description:
      "IDs, birth certificates, wills and important personal information.",
    tone: {
      bg: "bg-violet-50",
      ring: "ring-violet-100",
      iconBg: "bg-violet-100",
      iconText: "text-violet-700",
      bar: "bg-violet-500",
      pill: "bg-violet-100 text-violet-800",
    },
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  health: {
    description:
      "Medical records, health insurance, medications and doctors.",
    tone: {
      bg: "bg-amber-50",
      ring: "ring-amber-100",
      iconBg: "bg-amber-100",
      iconText: "text-amber-700",
      bar: "bg-amber-500",
      pill: "bg-amber-100 text-amber-800",
    },
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 21s-7-4.5-9-9.5C1.5 7 5 4 8 4c1.7 0 3.1.9 4 2.2C12.9 4.9 14.3 4 16 4c3 0 6.5 3 5 7.5-2 5-9 9.5-9 9.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  education: {
    description:
      "Certificates, transcripts, resumes and study records.",
    tone: {
      bg: "bg-sky-50",
      ring: "ring-sky-100",
      iconBg: "bg-sky-100",
      iconText: "text-sky-700",
      bar: "bg-sky-500",
      pill: "bg-sky-100 text-sky-800",
    },
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M2 9l10-5 10 5-10 5L2 9Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  employment: {
    description:
      "Work contracts, tax details, super and payslips.",
    tone: {
      bg: "bg-rose-50",
      ring: "ring-rose-100",
      iconBg: "bg-rose-100",
      iconText: "text-rose-700",
      bar: "bg-rose-500",
      pill: "bg-rose-100 text-rose-800",
    },
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M3 13h18" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
  admin: {
    description:
      "Finances, accounts, utility bills, insurance and paperwork.",
    tone: {
      bg: "bg-emerald-50",
      ring: "ring-emerald-100",
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-700",
      bar: "bg-emerald-600",
      pill: "bg-emerald-100 text-emerald-800",
    },
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4V4Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
};

export default async function RecordsIndex() {
  const session = await requireSession();
  const [all, categoryProgress] = await Promise.all([
    listUserRecords(session.user.id),
    categoryProgressForFamily(session.user.familyGroupId),
  ]);
  const expiringSoon = all.filter(
    (r) => r.status === "expiring_soon" || r.status === "expired"
  );

  let totalFolders = 0;
  let startedFolders = 0;
  let completedFolders = 0;
  for (const id of CATEGORY_IDS) {
    const p = categoryProgress.get(id);
    totalFolders += p?.totalFolders ?? 0;
    startedFolders += p?.startedFolders ?? 0;
    completedFolders += p?.completedFolders ?? 0;
  }

  return (
    <div>
      <header className="rounded-2xl bg-tal-cream-soft border border-tal-line px-5 py-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-tal-plum text-white shrink-0"
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2a1.5 1.5 0 0 1 1.05.43l1.32 1.29c.28.27.66.43 1.05.43H19.5A1.5 1.5 0 0 1 21 8.65v9.35a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6.5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className="font-display text-2xl text-tal-plum leading-tight">
            Life Admin
          </h1>
          <span className="text-tal-plum-soft/50" aria-hidden>·</span>
          <p className="text-tal-plum-soft text-sm">
            All your important information, organised in one place.
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/records/search"
              className="h-9 px-3 rounded-lg border border-tal-line bg-white text-sm text-tal-plum-soft hover:text-tal-plum inline-flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" />
                <path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              Search records
            </Link>
            <Link
              href="/records/personal/new"
              className="h-9 px-3 rounded-lg bg-black text-white text-sm font-medium hover:bg-tal-plum-dark inline-flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Add Record
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <StatCard
          tone="violet"
          icon={<FolderIcon />}
          value={`${CATEGORY_IDS.length} Categories`}
          subtitle="Everything organised by type"
          href="#categories"
        />
        <StatCard
          tone="sky"
          icon={<CheckIcon />}
          value={`${completedFolders} of ${totalFolders} folders complete`}
          subtitle={
            startedFolders > completedFolders
              ? `${startedFolders - completedFolders} in progress`
              : "Keep building your profile"
          }
          href="/tasks"
        />
        <StatCard
          tone="emerald"
          icon={<ShieldIcon />}
          value="Secure & private"
          subtitle="Always backed up"
          href="/security"
        />
      </div>

      {expiringSoon.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-700" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3 2 20h20L12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path d="M12 10v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="17" r="1" fill="currentColor" />
              </svg>
            </span>
            <h2 className="font-display text-tal-plum">
              Expiring or expired ({expiringSoon.length})
            </h2>
          </div>
          <ul className="text-sm space-y-1">
            {expiringSoon.slice(0, 5).map((r) => (
              <li key={r.id}>
                <Link
                  href={`/records/${r.category_id}/r/${r.id}`}
                  className="hover:underline"
                >
                  <span className="font-medium">{r.title}</span>{" "}
                  <span className="text-tal-plum-soft">
                    — {CATEGORY_LABELS[r.category_id]} · expires {r.expiry_date}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2
        id="categories"
        className="font-display text-xl text-tal-plum mb-3 scroll-mt-4"
      >
        Choose a category from below or manage your records
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_IDS.map((id) => {
          const p = categoryProgress.get(id);
          const done = p?.completedFolders ?? 0;
          const total = p?.totalFolders ?? 0;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const meta = CATEGORY_META[id];
          return (
            <Link
              key={id}
              href={`/records/${id}`}
              className={
                "group flex flex-col rounded-2xl ring-1 p-5 hover:shadow-md hover:-translate-y-0.5 transition " +
                meta.tone.bg +
                " " +
                meta.tone.ring
              }
            >
              <div className="flex items-start gap-3 mb-3">
                <span
                  className={
                    "inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0 " +
                    meta.tone.iconBg +
                    " " +
                    meta.tone.iconText
                  }
                  aria-hidden
                >
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg text-tal-plum leading-tight">
                    {CATEGORY_LABELS[id]}
                  </div>
                  <p className="text-xs text-tal-plum-soft mt-1 leading-snug">
                    {meta.description}
                  </p>
                </div>
              </div>
              <div className="mt-auto">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-tal-plum-soft">
                    {done} of {total} folders complete
                  </span>
                  <span
                    className={
                      "font-medium px-2 py-0.5 rounded-full " + meta.tone.pill
                    }
                  >
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/80 overflow-hidden">
                  <div
                    className={"h-full transition-all " + meta.tone.bar}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <section className="mt-6 rounded-2xl bg-tal-cream-soft border border-tal-line px-5 py-4 flex items-center gap-4 flex-wrap">
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-tal-plum text-white shrink-0"
          aria-hidden
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <circle cx="12" cy="17" r="1" fill="currentColor" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-tal-plum">New to Life Admin?</div>
          <p className="text-xs text-tal-plum-soft">
            Not sure where to start? We can help you set up your important
            information step by step.
          </p>
        </div>
        <Link
          href="/tasks"
          className="h-9 px-3 rounded-lg border border-tal-line bg-white text-sm text-tal-plum hover:shadow-sm inline-flex items-center gap-1"
        >
          View Getting Started Guide →
        </Link>
      </section>
    </div>
  );
}

function StatCard({
  tone,
  icon,
  value,
  subtitle,
  href,
}: {
  tone: "violet" | "sky" | "emerald";
  icon: React.ReactNode;
  value: string;
  subtitle: string;
  href: string;
}) {
  const bg =
    tone === "violet"
      ? "bg-violet-50 ring-violet-100"
      : tone === "sky"
        ? "bg-sky-50 ring-sky-100"
        : "bg-emerald-50 ring-emerald-100";
  const iconBg =
    tone === "violet"
      ? "bg-violet-100 text-violet-700"
      : tone === "sky"
        ? "bg-sky-100 text-sky-700"
        : "bg-emerald-100 text-emerald-700";
  return (
    <Link
      href={href}
      className={
        "group rounded-2xl ring-1 p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition " +
        bg
      }
    >
      <span
        className={
          "inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 " +
          iconBg
        }
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-tal-plum leading-tight">
          {value}
        </div>
        <div className="text-[11px] text-tal-plum-soft mt-0.5">{subtitle}</div>
      </div>
      <span
        className="text-tal-plum-soft/70 group-hover:text-tal-plum transition-colors shrink-0"
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.2a1.5 1.5 0 0 1 1.05.43l1.32 1.29c.28.27.66.43 1.05.43H19.5A1.5 1.5 0 0 1 21 8.65v9.35a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V6.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="m8 12 3 3 5-6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 4 6v6c0 4.5 3 8 8 9 5-1 8-4.5 8-9V6l-8-3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
