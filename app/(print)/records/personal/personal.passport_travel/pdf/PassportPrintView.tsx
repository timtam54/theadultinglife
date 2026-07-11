"use client";

import { useEffect, useRef, useState } from "react";

function fmtDate(v: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

export function PassportPrintView({
  answers,
  portraitUrl,
  signatureUrl,
}: {
  answers: Record<string, string | null>;
  portraitUrl: string | null;
  signatureUrl: string | null;
}) {
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const totalImages = (portraitUrl ? 1 : 0) + (signatureUrl ? 1 : 0);
  const printedRef = useRef(false);

  useEffect(() => {
    if (printedRef.current) return;
    if (imagesLoaded < totalImages) return;
    printedRef.current = true;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [imagesLoaded, totalImages]);

  const v = (k: string) => (answers[k] ?? "").toString().toUpperCase();

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        .passport-card {
          background: #f4ece0;
          font-family: 'Courier New', monospace;
          color: #1e293b;
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-tal-cream-soft border-b border-tal-line text-tal-plum text-sm">
        <span>
          A print dialog should open automatically. Choose{" "}
          <strong>Save as PDF</strong> as the destination.
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
        <div className="passport-card rounded-xl shadow overflow-hidden p-6 sm:p-8">
          <div className="uppercase tracking-widest text-xl font-bold mb-4">
            Passport
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4 flex flex-col gap-3">
              <div className="aspect-[3/4] bg-white/60 border border-slate-300 rounded-md overflow-hidden flex items-center justify-center text-xs text-slate-400">
                {portraitUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={portraitUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onLoad={() => setImagesLoaded((n) => n + 1)}
                    onError={() => setImagesLoaded((n) => n + 1)}
                  />
                ) : (
                  "Portrait"
                )}
              </div>
              <div className="h-14 border-t border-slate-300 flex items-end pt-1 text-xs text-slate-500">
                {signatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signatureUrl}
                    alt=""
                    className="h-full object-contain"
                    onLoad={() => setImagesLoaded((n) => n + 1)}
                    onError={() => setImagesLoaded((n) => n + 1)}
                  />
                ) : (
                  "Holder's signature"
                )}
              </div>
            </div>

            <div className="col-span-8 grid grid-cols-2 gap-x-6 gap-y-3">
              <Field label="Type" value={v("passport.type")} />
              <Field
                label="Code of issuing State"
                value={v("passport.country_code")}
              />
              <div className="col-span-2">
                <Field label="Document No." value={v("passport.document_no")} />
              </div>
              <div className="col-span-2">
                <Field
                  label="Family name / Nom"
                  value={v("passport.family_name")}
                />
              </div>
              <div className="col-span-2">
                <Field
                  label="Given names / Prénoms"
                  value={v("passport.given_names")}
                />
              </div>
              <div className="col-span-2">
                <Field
                  label="Nationality / Nationalité"
                  value={v("passport.nationality")}
                />
              </div>
              <Field
                label="Date of birth / Date de naissance"
                value={fmtDate(answers["passport.date_of_birth"] ?? null)}
              />
              <Field label="Sex / Sexe" value={v("passport.sex")} />
              <div className="col-span-2">
                <Field
                  label="Place of birth / Lieu de naissance"
                  value={v("passport.place_of_birth")}
                />
              </div>
              <Field
                label="Date of issue / Date de délivrance"
                value={fmtDate(answers["passport.date_of_issue"] ?? null)}
              />
              <Field
                label="Date of expiry / Date d'expiration"
                value={fmtDate(answers["passport.date_of_expiry"] ?? null)}
              />
              <div className="col-span-2">
                <Field
                  label="Authority / Autorité"
                  value={v("passport.authority")}
                />
              </div>
            </div>
          </div>

          {(answers["passport.mrz_line_1"] || answers["passport.mrz_line_2"]) && (
            <div className="mt-6 border-t border-slate-300 pt-3 text-[13px] leading-relaxed tracking-wider">
              <div>{answers["passport.mrz_line_1"]}</div>
              <div>{answers["passport.mrz_line_2"]}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">
        {label}
      </div>
      <div className="text-base font-bold uppercase">{value || "—"}</div>
    </div>
  );
}
