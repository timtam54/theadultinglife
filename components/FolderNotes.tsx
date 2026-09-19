"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SmartTextarea } from "@/components/SmartTextarea";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

// Per-folder Notes prompts. When a folder isn't in this map the generic
// "add a private note for your family" copy is used. Keep entries short —
// they replace the empty-state paragraph verbatim.
const FOLDER_NOTE_HINTS: Record<string, string> = {
  "personal.birth_certificates":
    "Choose to keep a scanned copy of your Birth Certificate, extract information from the certificate to complete the fields below, or both.",
  "personal.marriage_certificate":
    "Choose to keep a scanned copy of your Marriage Certificate, extract information from the certificate to complete the fields below, or both.",
  "personal.passport_travel":
    "Choose to keep a scanned copy of your Passport, extract information from the Passport to complete the fields below, or both.",
  "personal.will_funeral":
    "Choose to keep a scanned copy of your Will, extract the relevant information to complete the fields below, or both.",
  "personal.power_of_attorney":
    "Choose to keep a scanned copy of your Power of Attorney, extract the relevant information to complete the fields below, or both.",
  "personal.advanced_health_directive":
    "Keep a scanned copy of your official Advance Health Directive here.",
  "personal.electoral_roll":
    "Choose to keep a scanned copy of your Electoral Roll information/application, extract the relevant information to complete the fields below, or both.",
  "personal.tax_file_number":
    "Choose to keep a scanned copy of your TFN application or related document, extract the relevant information to complete the fields below, or both.",
  "personal.abn":
    "Choose to keep a scanned copy of your ABN application form or completion/registration certificate, extract the relevant information to complete the fields below, or both.",
  "personal.drivers_licence":
    "Choose to keep a scanned copy of your licence, extract information from the licence to complete the fields below, or both.",
  "personal.licences_ids":
    "Choose to keep a scanned copy of your licence or ID, extract information from the document to complete the fields below, or both.",
  "personal.vehicle_details":
    "Keep a scanned copy of your registration documents here.",
  "personal.home_property_rates_rent":
    "Scan your rental contract, complete the information fields below, or do both.",
  "health.health_insurance_cards":
    "Scan and save copies of your health cards here.",
  "health.concession_cards":
    "Scan and save copies of your concession cards here.",
  "health.pension_cards":
    "Scan and save copies of your pension cards here, complete the information fields, or do both.",
  "health.health_insurance":
    "Scan and save copies of your policies here, complete the information fields, or do both.",
  "health.life_insurance":
    "Scan and save copies of your policies here, complete the information fields, or do both.",
};

export function FolderNotes({
  subcategoryId,
  initialBody,
  updatedAt,
  emptyHint,
}: {
  subcategoryId: string;
  initialBody: string;
  updatedAt: string | null;
  /** Folder-specific prompt shown when the note is empty. Overrides the
   *  generic "add a private note for your family" copy so different
   *  folders can guide the user with different instructions. */
  emptyHint?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const isDirty = editing && body !== initialBody;
  useUnsavedChangesGuard(isDirty);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/folder-notes/${encodeURIComponent(subcategoryId)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body }),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const isEmpty = !body.trim();

  return (
    <section className="rounded-2xl border border-tal-line bg-amber-50/40 p-5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-700"
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 5.5A1.5 1.5 0 0 1 5.5 4H16l4 4v10.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-13Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path d="M15 4v5h5" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </span>
          <h3 className="font-display text-lg text-tal-plum">Notes</h3>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-tal-plum-soft hover:text-tal-plum underline"
          >
            {isEmpty ? "Add note" : "Edit"}
          </button>
        )}
      </div>

      {editing ? (
        <>
          <SmartTextarea
            value={body}
            onChange={setBody}
            rows={5}
            placeholder="e.g. Passport in fireproof safe, top drawer of my bedroom."
            ariaLabel="Folder note"
          />
          {err && <div className="text-xs text-red-600 mt-2">{err}</div>}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-9 px-3 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save note"}
            </button>
            <button
              type="button"
              onClick={() => {
                setBody(initialBody);
                setEditing(false);
                setErr(null);
              }}
              className="h-9 px-3 rounded-lg border border-tal-line text-sm text-tal-plum-soft hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </>
      ) : isEmpty ? (
        <p className="text-sm text-tal-plum-soft">
          {emptyHint ??
            FOLDER_NOTE_HINTS[subcategoryId] ??
            "Add a private note for your family — reminders, where the physical document lives, who to call."}
        </p>
      ) : (
        <>
          <p className="text-sm text-tal-plum whitespace-pre-line">{body}</p>
          {updatedAt && (
            <p className="text-[10px] text-tal-plum-soft mt-2 uppercase tracking-widest">
              Updated {new Date(updatedAt).toLocaleDateString("en-AU")}
            </p>
          )}
        </>
      )}
    </section>
  );
}
