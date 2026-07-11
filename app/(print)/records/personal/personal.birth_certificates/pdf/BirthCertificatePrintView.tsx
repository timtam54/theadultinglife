"use client";

import { useEffect, useRef } from "react";

function fmtDate(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

export function BirthCertificatePrintView({
  answers,
  userName,
}: {
  answers: Record<string, string | null>;
  userName: string;
}) {
  const printedRef = useRef(false);

  useEffect(() => {
    if (printedRef.current) return;
    printedRef.current = true;
    const t = setTimeout(() => window.print(), 200);
    return () => clearTimeout(t);
  }, []);

  const v = (k: string) => (answers[k] ?? "").toString().toUpperCase();

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        .bc-card {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.7)),
            linear-gradient(135deg, #f9c2d1 0%, #fbdae3 40%, #f7c9b4 100%);
          background-blend-mode: normal;
          border: 2px solid #b25a75;
          color: #2b1e26;
        }
        .bc-title {
          font-family: 'Times New Roman', Times, serif;
          letter-spacing: 0.15em;
        }
        .bc-section-label {
          font-family: 'Times New Roman', Times, serif;
          font-weight: 700;
          letter-spacing: 0.14em;
          font-size: 10px;
          color: #7d1f3d;
        }
        .bc-field-label {
          font-size: 10px;
          color: #7d1f3d;
          letter-spacing: 0.05em;
        }
        .bc-value {
          font-family: 'Courier New', monospace;
          font-weight: 700;
          font-size: 13px;
          color: #1b0f16;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-tal-cream-soft border-b border-tal-line text-tal-plum text-sm">
        <span>
          A print dialog should open. Choose <strong>Save as PDF</strong>.
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="h-9 px-3 rounded-xl bg-tal-plum text-white text-sm font-medium hover:bg-tal-plum-dark"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-6 sm:p-8">
        <div className="bc-card rounded-xl shadow p-6 sm:p-8">
          <div className="text-center mb-4">
            <div className="bc-title text-[11px] uppercase text-[#7d1f3d]">
              Births, Deaths and Marriages Registration Act
            </div>
            <div className="bc-title text-[11px] uppercase text-[#7d1f3d]">
              {v("bc.authority") || "Registration Authority"}
            </div>
            <div className="bc-title text-2xl mt-2 font-bold uppercase text-[#5c122d]">
              Birth Certificate
            </div>
          </div>

          <Section label="Child">
            <Field label="Surname" value={v("bc.child_surname")} />
            <Field label="Given name(s)" value={v("bc.child_given_names")} />
            <Field label="Sex" value={v("bc.child_sex")} />
            <Field
              label="Date of Birth"
              value={fmtDate(answers["bc.child_date_of_birth"])}
            />
            <Field
              label="Place of Birth"
              value={v("bc.child_place_of_birth")}
              full
            />
          </Section>

          <Section label="Mother">
            <Field label="Surname" value={v("bc.mother_surname")} />
            <Field label="Former surname" value={v("bc.mother_former_surname")} />
            <Field label="Given name(s)" value={v("bc.mother_given_names")} />
            <Field
              label="Age"
              value={
                answers["bc.mother_age"]
                  ? `${answers["bc.mother_age"]} YEARS`
                  : ""
              }
            />
            <Field label="Place of Birth" value={v("bc.mother_place_of_birth")} full />
            <Field label="Occupation" value={v("bc.mother_occupation")} full />
          </Section>

          <Section label="Father">
            <Field label="Surname" value={v("bc.father_surname")} />
            <Field label="Given name(s)" value={v("bc.father_given_names")} />
            <Field
              label="Age"
              value={
                answers["bc.father_age"]
                  ? `${answers["bc.father_age"]} YEARS`
                  : ""
              }
            />
            <Field label="Place of Birth" value={v("bc.father_place_of_birth")} />
            <Field label="Occupation" value={v("bc.father_occupation")} full />
          </Section>

          <Section label="Marriage of Parents">
            <Field
              label="Date of marriage"
              value={fmtDate(answers["bc.marriage_date"])}
            />
            <Field label="Place of marriage" value={v("bc.marriage_place")} />
          </Section>

          {answers["bc.previous_children"] && (
            <Section label="Previous Children of Parents">
              <div className="bc-value whitespace-pre-wrap col-span-2">
                {v("bc.previous_children")}
              </div>
            </Section>
          )}

          <Section label="Informant">
            <Field
              label="Name (relationship to child)"
              value={v("bc.informant_name")}
              full
            />
            <Field label="Occupation" value={v("bc.informant_occupation")} />
            <Field label="Address" value={v("bc.informant_address")} />
          </Section>

          <Section label="Registration">
            <Field
              label="Registration date"
              value={fmtDate(answers["bc.registration_date"])}
            />
            <Field
              label="Registration number"
              value={v("bc.registration_number")}
            />
          </Section>

          <div className="mt-6 pt-3 border-t border-[#b25a75]/40 flex items-end justify-between">
            <div className="text-[10px] text-[#7d1f3d] uppercase tracking-widest">
              Certificate for
              <div className="text-[13px] text-[#1b0f16] font-bold mt-0.5 tracking-normal">
                {userName || "—"}
              </div>
            </div>
            <div className="text-right">
              <div className="w-48 border-t border-[#7d1f3d] pt-1 text-[10px] text-[#7d1f3d] uppercase tracking-widest">
                Registrar-General
              </div>
            </div>
          </div>
          <div className="mt-3 text-center text-[9px] text-[#7d1f3d]/70">
            Generated from The Adulting Life — not a legal copy.
          </div>
        </div>
      </div>
    </>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 border-t border-[#b25a75]/40 pt-3">
      <div className="bc-section-label mb-2 uppercase">{label}</div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="bc-field-label uppercase mb-0.5">{label}</div>
      <div className="bc-value">{value || "—"}</div>
    </div>
  );
}
