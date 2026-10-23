// Maps an AI scan of a document onto a page form's questions. Shared by the
// form (PageForm) and the scan quality check, so both behave identically.

import type { PageQuestionRow } from "@/lib/db/types";
import type { FileScanResult } from "@/components/FileFieldInput";

// Convert a raw AI scan result into an answers patch for a page-form entry.
// Maps each scan.fields[].label to a question id by normalising both sides
// (lowercase, strip punctuation, collapse whitespace) and doing an exact +
// then a substring match. Only fills empty answers by default so the user's
// typed values aren't clobbered — pass overwrite=true to force.
//
// Also promotes scan.expiryDate → any question whose label contains "expiry"
// (or "expires"), and scan.notes → any question whose id ends in ".notes"
// or label equals "notes".
interface ScanMappingResult {
  /** Answers ready to write to matched questions. */
  patch: Record<string, string>;
  /** Fields the AI returned that didn't map to any existing question.
   *  Feed these to the admin "propose new fields" widget. */
  unmatched: { label: string; type: "text" | "date" | "number"; value: string }[];
  /** Labels of questions the AI returned a value for, but which already
   *  had a non-empty answer (from the profile mirror or a prior save). Used
   *  to tell the user "we skipped X, Y because those fields were already
   *  filled" instead of silently dropping the scanned value. */
  skipped: string[];
}

export function scanResultToAnswersPatch(
  questions: PageQuestionRow[],
  scan: FileScanResult,
  existingAnswers: Record<string, string | null>,
  opts: { overwrite?: boolean } = {}
): ScanMappingResult {
  function norm(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  }
  // Question ids that represent workflow state (archived / completed /
  // end date) rather than something contained IN the document. The scan
  // should never touch these — otherwise archiving happens automatically
  // when a user uploads a recipe.
  function isWorkflowState(qid: string, label: string): boolean {
    const nl = label.toLowerCase();
    if (
      qid.endsWith("_archived") ||
      qid.endsWith(".date_archived") ||
      qid.endsWith(".end_date") ||
      qid.endsWith(".date_completed") ||
      qid.endsWith(".end")
    ) {
      return true;
    }
    return (
      nl.includes("archived") ||
      nl.includes("completed") ||
      nl.includes("end date")
    );
  }
  const questionsById = new Map(questions.map((q) => [q.id, q]));

  const patch: Record<string, string> = {};
  const skipped: string[] = [];
  const set = (qid: string, value: string) => {
    // The model sometimes writes "null" / "N/A" for a field it couldn't read.
    if (!value || /^(null|none|n\/?a|-|—)$/i.test(value.trim())) return;
    const q = questionsById.get(qid);
    // File / image / linked_entry answers are UUIDs / instance ids, not
    // text extracted from a document. The AI can't sensibly fill them,
    // and if it tries (e.g. writes the doc title into a file field) the
    // viewer breaks trying to fetch /api/files/<title>. Skip them.
    if (
      q &&
      (q.question_type === "file" ||
        q.question_type === "image" ||
        q.question_type === "linked_entry" ||
        q.question_type === "transactions_json")
    ) {
      return;
    }
    if (q && isWorkflowState(qid, q.label)) return;
    const isEmpty =
      existingAnswers[qid] == null ||
      (existingAnswers[qid] as string).trim().length === 0;
    if (isEmpty || opts.overwrite) {
      patch[qid] = value;
    } else if (q) {
      skipped.push(q.label);
    }
  };

  const qByNormLabel = new Map<string, PageQuestionRow>();
  for (const q of questions) qByNormLabel.set(norm(q.label), q);

  const unmatched: ScanMappingResult["unmatched"] = [];
  // Answers keyed by question id (the per-field reader) — use them as-is.
  if (scan.answers) {
    for (const [qid, value] of Object.entries(scan.answers)) {
      if (questionsById.has(qid)) set(qid, value);
    }
    return { patch, unmatched, skipped };
  }
  for (const f of scan.fields) {
    if (!f.value) continue;
    const nl = norm(f.label);
    let q = qByNormLabel.get(nl) ?? null;
    if (!q) {
      // Substring fallback in either direction.
      for (const cand of questions) {
        const cn = norm(cand.label);
        if (cn.includes(nl) || nl.includes(cn)) {
          q = cand;
          break;
        }
      }
    }
    if (q) {
      set(q.id, f.value);
    } else {
      unmatched.push({ label: f.label, type: f.type, value: f.value });
    }
  }

  if (scan.expiryDate) {
    // Only route the AI's expiryDate hint to a field literally labelled
    // "expiry" / "expires". Never to archive/completed/end dates — those
    // are workflow state, not something the document contains.
    const expiryQ = questions.find((q) => {
      const nl = norm(q.label);
      const isArchiveField =
        q.id.endsWith("_archived") ||
        q.id.endsWith(".date_archived") ||
        nl.includes("archived") ||
        nl.includes("completed") ||
        nl.includes("end date");
      if (isArchiveField) return false;
      return nl.includes("expiry") || nl.includes("expires");
    });
    if (expiryQ) set(expiryQ.id, scan.expiryDate);
  }
  if (scan.notes) {
    // Prefer a body-shaped field (e.g. "Recipe") over the generic Notes
    // field so long-form content lands where users expect it.
    const bodyQ = questions.find(
      (q) =>
        q.question_type === "textarea" &&
        (q.id.endsWith(".recipe") ||
          q.id.endsWith(".body") ||
          norm(q.label) === "recipe" ||
          norm(q.label) === "body")
    );
    const notesQ = questions.find(
      (q) => q.id.endsWith(".notes") || norm(q.label) === "notes"
    );
    const target = bodyQ ?? notesQ;
    if (target) set(target.id, scan.notes);
  }
  return { patch, unmatched, skipped };
}

// Turns a scan mapping result into a short one-line notice for the user.
// Names the fields that got filled and the ones that were skipped because
// they already had a value — so a scan of a licence into a form that's
// already got the surname pre-filled doesn't just silently drop it.
