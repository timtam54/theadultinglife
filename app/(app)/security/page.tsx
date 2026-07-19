import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Security & Privacy",
  description:
    "How your Adulting Life information is protected — encryption, backups, access, and your control.",
};

export default async function SecurityPage() {
  await requireSession();
  return (
    <div>
      <div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
        <Link
          href="/records"
          className="text-tal-plum-soft hover:text-tal-plum transition-colors"
        >
          Life Admin
        </Link>
        <span className="text-tal-plum-soft/50" aria-hidden>
          /
        </span>
        <span className="text-tal-plum-soft">Security &amp; Privacy</span>
      </div>

      <header className="rounded-2xl bg-tal-cream-soft border border-tal-line px-5 py-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 shrink-0"
            aria-hidden
          >
            <ShieldIcon />
          </span>
          <div>
            <h1 className="font-display text-2xl text-tal-plum leading-tight">
              Security &amp; Privacy
            </h1>
            <p className="text-tal-plum-soft text-sm">
              How your information is protected — and what stays under your
              control.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          tone="emerald"
          icon={<LockIcon />}
          title="Encrypted in storage"
          body="Everything you upload — documents, photos, form entries — is stored on managed infrastructure and encrypted at rest. Files and records sit behind per-user access rules, so another account can't reach into yours."
        />
        <InfoCard
          tone="violet"
          icon={<EyeIcon />}
          title="Only you (and who you invite)"
          body="Your family group starts with just you. If you add family members, you choose who is a member and what they can see. No one at The Adulting Life reads your records."
        />
        <InfoCard
          tone="sky"
          icon={<CloudIcon />}
          title="Backed up automatically"
          body="Data is backed up by our infrastructure provider so an accidental loss on your device doesn't mean losing your records. You can also print or export an emergency page anytime."
        />
        <InfoCard
          tone="amber"
          icon={<KeyIcon />}
          title="You stay in control"
          body="Update your password, sign out other sessions, or delete individual records at any time. If you want to leave, we make it possible to export or purge everything you've stored."
        />
      </div>

      <section className="mt-6 rounded-2xl border border-tal-line bg-white p-6">
        <h2 className="font-display text-xl text-tal-plum mb-3">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/settings"
            className="rounded-xl border border-tal-line bg-tal-cream-soft/40 p-4 hover:shadow-sm transition"
          >
            <div className="font-medium text-tal-plum">
              Update password &amp; account settings
            </div>
            <p className="text-xs text-tal-plum-soft mt-1">
              Change your password, review your details.
            </p>
          </Link>
          <Link
            href="/emergency"
            className="rounded-xl border border-tal-line bg-tal-cream-soft/40 p-4 hover:shadow-sm transition"
          >
            <div className="font-medium text-tal-plum">
              Emergency page (print or share)
            </div>
            <p className="text-xs text-tal-plum-soft mt-1">
              One page with everything a paramedic or trusted person needs.
            </p>
          </Link>
        </div>
      </section>

      <p className="mt-6 text-xs text-tal-plum-soft">
        We&apos;re building this app with security as the top priority. As we
        add features (e.g. the Domestic Violence vault), each will get its own
        stricter access layer.
      </p>
    </div>
  );
}

function InfoCard({
  tone,
  icon,
  title,
  body,
}: {
  tone: "emerald" | "violet" | "sky" | "amber";
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const bg =
    tone === "emerald"
      ? "bg-emerald-50 ring-emerald-100"
      : tone === "violet"
        ? "bg-violet-50 ring-violet-100"
        : tone === "sky"
          ? "bg-sky-50 ring-sky-100"
          : "bg-amber-50 ring-amber-100";
  const iconBg =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "violet"
        ? "bg-violet-100 text-violet-700"
        : tone === "sky"
          ? "bg-sky-100 text-sky-700"
          : "bg-amber-100 text-amber-700";
  return (
    <div className={"rounded-2xl ring-1 p-5 " + bg}>
      <div className="flex items-start gap-3 mb-2">
        <span
          className={
            "inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 " +
            iconBg
          }
          aria-hidden
        >
          {icon}
        </span>
        <h3 className="font-display text-lg text-tal-plum leading-tight mt-1">
          {title}
        </h3>
      </div>
      <p className="text-sm text-tal-plum-soft leading-relaxed">{body}</p>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 10V7a4 4 0 1 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 18a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18 10.09 4 4 0 0 1 17 18H7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="8" cy="14" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="m12 12 8-8m-3 3 2 2m-4 0 2 2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
