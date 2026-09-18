import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { listUsersInFamilyGroup } from "@/lib/db/users";
import { loadPageFormByGroup } from "@/lib/services/pageForm";
import { PrintTrigger } from "@/components/PrintTrigger";
import { formatQuestionValue } from "@/lib/services/format-question-value";

export const metadata: Metadata = {
  title: "Print · Family Members",
  robots: { index: false, follow: false },
};

// Renders every family member (or one, if ?userId=... is set) as a printable
// stack of cards: core identity + address + bank + super + the "More about
// this person" extras (nicknames, POB, parents, marital status, partner,
// children, employment). Auto-fires window.print() so the user is straight
// into the Save-as-PDF dialog.
export default async function FamilyMembersPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const allUsers = await listUsersInFamilyGroup(session.user.familyGroupId);
  const users = params.userId
    ? allUsers.filter((u) => u.id === params.userId)
    : allUsers;

  // Load extras for every user in parallel — one small query each; the
  // pom.personal group has 13 questions total.
  const extras = await Promise.all(
    users.map(async (u) => {
      const form = await loadPageFormByGroup(u.id, "pom.personal");
      return { userId: u.id, form };
    })
  );
  const extrasByUser = new Map(extras.map((e) => [e.userId, e.form]));

  const printedOn = new Date().toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-8 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <div className="text-sm text-tal-plum-soft">
          Family Members — print preview
        </div>
        <PrintTrigger />
      </div>

      <h1 className="font-display text-2xl sm:text-3xl text-tal-plum leading-tight mb-6">
        Family Members
      </h1>

      {users.length === 0 && (
        <p className="text-sm text-tal-plum-soft italic">
          No family members to print.
        </p>
      )}

      <div className="space-y-6">
        {users.map((u) => {
          const form = extrasByUser.get(u.id);
          const answers = form?.answers ?? {};
          const qById = new Map(
            (form?.questions ?? []).map((q) => [q.id, q])
          );
          const displayName =
            [u.first_name, u.last_name].filter(Boolean).join(" ") ||
            u.email ||
            "Untitled";

          function extra(id: string): string | null {
            const raw = answers[id];
            if (typeof raw !== "string" || raw.trim().length === 0) return null;
            return formatQuestionValue(qById.get(id), raw);
          }

          return (
            <section
              key={u.id}
              className="rounded-2xl border border-tal-line bg-white p-5 break-inside-avoid print:break-after-page"
            >
              <h2 className="font-display text-xl text-tal-plum mb-3">
                {displayName}
                <span className="ml-2 text-xs uppercase tracking-widest text-tal-plum-soft">
                  {u.member_kind}
                  {u.is_primary && " · Primary login"}
                </span>
              </h2>

              <SectionGrid>
                <Row label="Date of birth" value={fmtDate(u.birthday)} />
                <Row label="Email" value={u.email} />
                <Row label="Mobile phone" value={u.mobile_phone} />
                <Row label="Home phone" value={u.home_phone} />
                <Row
                  label="Home address"
                  value={cleanAddress(u.home_address)}
                  span
                />
                <Row
                  label="Mailing address"
                  value={cleanAddress(u.mailing_address)}
                  span
                />
                <Row label="Bank BSB" value={u.bank_bsb} />
                <Row label="Bank account number" value={u.bank_account_number} />
                <Row label="Super fund" value={u.super_fund} />
                <Row label="Super member number" value={u.super_member_number} />
              </SectionGrid>

              <div className="mt-4 pt-3 border-t border-tal-line">
                <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft font-semibold mb-2">
                  More about this person
                </div>
                <SectionGrid>
                  <Row label="Nicknames" value={extra("pom.personal.nicknames")} />
                  <Row
                    label="Place of birth"
                    value={extra("pom.personal.pob")}
                  />
                  <Row
                    label="Mother's name"
                    value={extra("pom.personal.mother_name")}
                  />
                  <Row
                    label="Father's name"
                    value={extra("pom.personal.father_name")}
                  />
                  <Row
                    label="Marital status"
                    value={extra("pom.personal.status")}
                  />
                  <Row
                    label="Partner's name"
                    value={extra("pom.personal.partner_name")}
                  />
                  <Row
                    label="Children"
                    value={extra("pom.personal.children")}
                    span
                  />
                  <Row
                    label="Other family / relationships"
                    value={extra("pom.personal.significant_rel")}
                    span
                  />
                  <Row
                    label="Employment status"
                    value={extra("pom.personal.employment_status")}
                  />
                  <Row
                    label="Employment details"
                    value={extra("pom.personal.employment_detail")}
                    span
                  />
                </SectionGrid>
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-tal-plum-soft">Printed {printedOn}</p>
    </div>
  );
}

function SectionGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">{children}</dl>
  );
}

function Row({
  label,
  value,
  span,
}: {
  label: string;
  value: string | null | undefined;
  span?: boolean;
}) {
  return (
    <div className={"min-w-0 " + (span ? "sm:col-span-2" : "")}>
      <dt className="text-xs uppercase tracking-wide text-tal-plum-soft">
        {label}
      </dt>
      <dd
        className={
          "text-sm mt-0.5 whitespace-pre-wrap " +
          (value ? "text-tal-plum" : "text-tal-plum-soft/60 italic")
        }
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// The home_address column carries a JSON blob ({"address":"…","lat":…,"lon":…})
// once Google Places is used. Print just the address string.
function cleanAddress(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { address?: unknown };
    if (parsed && typeof parsed === "object" && typeof parsed.address === "string") {
      return parsed.address;
    }
  } catch {
    /* legacy plain string */
  }
  return raw;
}
