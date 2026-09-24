"use client";

import { useEffect, useRef } from "react";
import type { MemberKind } from "@/lib/db/types";
import {
  PrintBanner,
  PrintFooter,
  PrintHeader,
  PrintStyles,
} from "@/components/print/PrintChrome";

interface Member {
  id: string;
  displayName: string;
  memberKind: MemberKind;
  isPrimary: boolean;
  birthday: string | null;
  email: string | null;
  mobilePhone: string | null;
  homePhone: string | null;
  homeAddress: string | null;
  mailingAddress: string | null;
  bankBsb: string | null;
  bankAccountNumber: string | null;
  superFund: string | null;
  superMemberNumber: string | null;
  taxFileNumber?: string | null;
  nicknames: string | null;
  placeOfBirth: string | null;
  motherName: string | null;
  fatherName: string | null;
  maritalStatus: string | null;
  partnerName: string | null;
  children: string | null;
  significantRel: string | null;
  employmentStatus: string | null;
  employmentDetail: string | null;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Field({
  label,
  value,
  extraLines = 0,
}: {
  label: string;
  value: string | null | undefined;
  extraLines?: number;
}) {
  return (
    <div className="mb-5">
      <div className="text-center text-[12px] text-tal-plum-dark mb-1 font-medium">
        {label}
      </div>
      <div className="border-b border-tal-plum-dark/40 min-h-[20px] text-[12px] text-tal-plum-dark px-1 pb-0.5 whitespace-pre-wrap break-words">
        {(value && value.trim()) || " "}
      </div>
      {Array.from({ length: extraLines }).map((_, i) => (
        <div
          key={i}
          className="border-b border-tal-plum-dark/40 min-h-[20px] mt-1"
          aria-hidden
        />
      ))}
    </div>
  );
}

export function FamilyMembersPrintClient({ members }: { members: Member[] }) {
  const printed = useRef(false);
  useEffect(() => {
    if (printed.current) return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);

  const meta =
    members.length === 0
      ? undefined
      : `${members.length} ${members.length === 1 ? "person" : "people"}`;

  return (
    <>
      <PrintStyles />
      <PrintBanner onPrint={() => window.print()} />

      <div className="max-w-[820px] mx-auto px-8 pt-6 pb-10 text-tal-plum-dark bg-white">
        <PrintHeader
          title="Family Members"
          subtitle="The Adulting Life Organiser"
          meta={meta}
        />

        {members.length === 0 && (
          <p className="text-tal-plum-soft text-center py-16">
            No family members to print.
          </p>
        )}

        {members.map((m, i) => (
          <section
            key={m.id}
            className={`print-avoid-break mb-8 ${i > 0 ? "print-page-break" : ""}`}
          >
            <h2 className="font-display text-lg text-tal-plum-dark border-b border-tal-plum-dark/30 pb-1 mb-4">
              {m.displayName}
              <span className="ml-2 text-[11px] uppercase tracking-widest text-tal-plum-soft">
                {m.memberKind}
                {m.isPrimary && " · Primary login"}
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <Field label="Date of birth" value={fmtDate(m.birthday)} />
              <Field label="Email" value={m.email} />
              <Field label="Mobile phone" value={m.mobilePhone} />
              <Field label="Home phone" value={m.homePhone} />
              <div className="sm:col-span-2">
                <Field label="Home address" value={m.homeAddress} extraLines={1} />
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Mailing address"
                  value={m.mailingAddress}
                  extraLines={1}
                />
              </div>
              <Field label="Bank BSB" value={m.bankBsb} />
              <Field label="Bank account number" value={m.bankAccountNumber} />
              <Field label="Super fund" value={m.superFund} />
              <Field label="Super member number" value={m.superMemberNumber} />
              <Field label="Tax file number" value={m.taxFileNumber ?? null} />
            </div>

            <h3 className="font-display text-base text-tal-plum-dark mt-6 mb-3">
              More about {m.displayName}…
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <Field label="Nicknames" value={m.nicknames} />
              <Field label="Place of birth" value={m.placeOfBirth} />
              <Field label="Mother's name" value={m.motherName} />
              <Field label="Father's name" value={m.fatherName} />
              <Field label="Marital status" value={m.maritalStatus} />
              <Field label="Partner's name" value={m.partnerName} />
              <div className="sm:col-span-2">
                <Field label="Children" value={m.children} extraLines={1} />
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="Other family / relationships"
                  value={m.significantRel}
                  extraLines={1}
                />
              </div>
              <Field label="Employment status" value={m.employmentStatus} />
              <div className="sm:col-span-2">
                <Field
                  label="Employment details"
                  value={m.employmentDetail}
                  extraLines={1}
                />
              </div>
            </div>
          </section>
        ))}

        <PrintFooter />
      </div>
    </>
  );
}
