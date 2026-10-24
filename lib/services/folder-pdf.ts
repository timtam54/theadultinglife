import { createServiceClient } from "@/lib/supabase/server";
import { findUserById } from "@/lib/db/users";
import { getUserSubcategory } from "@/lib/services/subcategories";
import { listQuestionsBySubcategory } from "@/lib/db/questions";
import { formatQuestionValue } from "@/lib/services/format-question-value";
import { renderDocPdf } from "@/lib/services/doc-pdf";
import { SECTION_COLOUR } from "@/lib/services/pdf-brand";
import type { CategoryId } from "@/lib/db/types";

// One folder's form (e.g. Will & Funeral Instructions) as a PDF built on the
// server, so it can be emailed — the on-screen "Download PDF" uses the
// browser's print instead, which can't be attached to an email.

export interface Entry {
  title: string | null;
  fields: { label: string; value: string }[];
}

export async function loadFolderEntries(input: {
  ownerUserId: string;
  subcategoryId: string;
  /** For folders with several entries (e.g. Power of Attorney): just this one. */
  instanceId?: string | null;
}): Promise<{ folderName: string; folderHint: string | null; ownerName: string; categoryId: CategoryId; entries: Entry[] }> {
  const [owner, folder, questions] = await Promise.all([
    findUserById(input.ownerUserId),
    getUserSubcategory(input.ownerUserId, input.subcategoryId),
    listQuestionsBySubcategory(input.subcategoryId),
  ]);
  if (!owner || !folder) throw new Error("not_found");
  const ownerName = [owner.first_name, owner.last_name].filter(Boolean).join(" ") || owner.name || "";

  const { data } = questions.length
    ? await createServiceClient()
        .from("question_responses")
        .select("question_id, instance_id, value")
        .eq("user_id", owner.id)
        .in(
          "question_id",
          questions.map((q) => q.id)
        )
    : { data: [] };
  const rows = (data ?? []) as { question_id: string; instance_id: string; value: string | null }[];

  // File fields show the document's name rather than its id.
  const fileIds = rows
    .filter((r) => {
      const t = questions.find((q) => q.id === r.question_id)?.question_type;
      return (t === "file" || t === "image") && r.value;
    })
    .map((r) => r.value as string);
  const { data: fileRows } = fileIds.length
    ? await createServiceClient().from("file_objects").select("id, filename").in("id", fileIds)
    : { data: [] };
  const fileName = new Map(((fileRows ?? []) as { id: string; filename: string }[]).map((f) => [f.id, f.filename]));

  const byInstance = new Map<string, Map<string, string>>();
  for (const r of rows) {
    if (!r.value) continue;
    const m = byInstance.get(r.instance_id) ?? new Map<string, string>();
    m.set(r.question_id, r.value);
    byInstance.set(r.instance_id, m);
  }
  const instanceIds = Array.from(byInstance.keys())
    .filter((id) => (folder.repeatable ? id !== "default" : id === "default"))
    .filter((id) => !input.instanceId || id === input.instanceId)
    .sort((a, b) => Number(a) - Number(b));

  const entries: Entry[] = instanceIds.map((id) => {
    const vals = byInstance.get(id)!;
    const fields = questions
      .map((q) => {
        const raw = vals.get(q.id);
        if (!raw || q.question_type === "transactions_json") return null;
        const value =
          q.question_type === "file" || q.question_type === "image"
            ? `Attached: ${fileName.get(raw) ?? "document"}`
            : formatQuestionValue(q, raw);
        return value ? { label: q.label, value } : null;
      })
      .filter((f): f is { label: string; value: string } => f !== null);
    return { title: folder.repeatable ? (fields.find((f) => !f.value.startsWith("Attached:"))?.value ?? null) : null, fields };
  });

  // Folders without a form keep plain records (title, expiry, notes).
  if (questions.length === 0) {
    const { data: recs } = await createServiceClient()
      .from("records")
      .select("title, expiry_date, notes, created_at")
      .eq("user_id", owner.id)
      .eq("subcategory_id", input.subcategoryId)
      .order("created_at");
    for (const r of (recs ?? []) as { title: string | null; expiry_date: string | null; notes: string | null }[]) {
      const fields = [
        { label: "Expiry", value: r.expiry_date ? new Date(r.expiry_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "" },
        { label: "Notes", value: r.notes ?? "" },
      ].filter((f) => f.value);
      entries.push({ title: r.title || "Untitled", fields });
    }
  }
  return { folderName: folder.name, folderHint: folder.hint, ownerName, categoryId: folder.category_id, entries };
}

export async function renderFolderFormPdf(input: {
  ownerUserId: string;
  subcategoryId: string;
  instanceId?: string | null;
}): Promise<{ bytes: Uint8Array; filename: string }> {
  const { folderName, ownerName, categoryId, entries } = await loadFolderEntries(input);
  const safe = `${folderName}${ownerName ? ` - ${ownerName}` : ""}`;
  return renderDocPdf({
    title: folderName,
    subtitle: ownerName || null,
    groups: [{ heading: folderName, sections: [{ blocks: entries.map((e) => ({ title: e.title, fields: e.fields })) }] }],
    emptyText: "Nothing has been filled in yet.",
    accent: SECTION_COLOUR[categoryId] ?? null,
    filename: `${safe}.pdf`,
  });
}
