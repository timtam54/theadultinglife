"use client";

import { useEffect, useState } from "react";

async function resolve(fileId: string | null): Promise<string | null> {
  if (!fileId) return null;
  const res = await fetch(`/api/files/${fileId}`);
  if (!res.ok) return null;
  const { url } = (await res.json()) as { url: string };
  return url;
}

function fmtDate(v: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

export function PassportPreview({
  answers,
  onClose,
}: {
  answers: Record<string, string | null>;
  onClose: () => void;
}) {
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setPortraitUrl(await resolve(answers["passport.portrait"] ?? null));
      setSignatureUrl(await resolve(answers["passport.signature"] ?? null));
    })();
  }, [answers]);

  const v = (k: string) => (answers[k] ?? "").toString().toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-[#f4ece0] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/80 hover:bg-white text-tal-plum-dark text-lg leading-none"
          aria-label="Close preview"
        >
          ×
        </button>
        <div className="p-6 sm:p-8" style={{ fontFamily: "'Courier New', monospace" }}>
          <div className="uppercase tracking-widest text-xl font-bold text-slate-800 mb-4">
            Passport
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4 flex flex-col gap-3">
              <div className="aspect-[3/4] bg-white/60 border border-slate-300 rounded-md overflow-hidden flex items-center justify-center text-xs text-slate-400">
                {portraitUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={portraitUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  "Portrait"
                )}
              </div>
              <div className="h-14 border-t border-slate-300 flex items-end pt-1 text-xs text-slate-500">
                {signatureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signatureUrl} alt="" className="h-full object-contain" />
                ) : (
                  "Holder's signature"
                )}
              </div>
            </div>

            <div className="col-span-8 grid grid-cols-2 gap-x-6 gap-y-3 text-slate-800">
              <Field label="Type" value={v("passport.type")} />
              <Field label="Code of issuing State" value={v("passport.country_code")} />
              <div className="col-span-2">
                <Field label="Document No." value={v("passport.document_no")} />
              </div>
              <div className="col-span-2">
                <Field label="Family name / Nom" value={v("passport.family_name")} />
              </div>
              <div className="col-span-2">
                <Field label="Given names / Prénoms" value={v("passport.given_names")} />
              </div>
              <div className="col-span-2">
                <Field label="Nationality / Nationalité" value={v("passport.nationality")} />
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
                <Field label="Authority / Autorité" value={v("passport.authority")} />
              </div>
            </div>
          </div>

          {(answers["passport.mrz_line_1"] || answers["passport.mrz_line_2"]) && (
            <div className="mt-6 border-t border-slate-300 pt-3 text-slate-800 text-[13px] leading-relaxed tracking-wider">
              <div>{answers["passport.mrz_line_1"]}</div>
              <div>{answers["passport.mrz_line_2"]}</div>
            </div>
          )}
        </div>
      </div>
    </div>
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
