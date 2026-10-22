import { createServiceClient } from "@/lib/supabase/server";
import { createSignedDownloadUrl } from "@/lib/supabase/storage";
import { findUserById } from "@/lib/db/users";
import { listGrantsByOwner } from "@/lib/db/item-access";
import { formatQuestionValue } from "@/lib/services/format-question-value";
import { loadPlannerPeople, peopleForEditor } from "@/lib/services/planner-people";
import { PLANNER_SECTIONS, type PlannerSection } from "@/lib/templates/peace-of-mind-v2";
import type { FileRow, PageQuestionRow, RecordRow, UserRow } from "@/lib/db/types";

// The Peace of Mind Planner as one document, in the same order as the
// physical Planner: groups → sections → entries. Used for
//   - printing the whole Planner (everything the owner has filled in), and
//   - the "shared with" document: only the items the owner has shared with
//     one trusted person, so it can be handed over as a whole.
// Sections with nothing in them are left out.

export interface DocImage {
  url: string;
  filename: string;
}

export interface DocBlock {
  title: string | null;
  fields: { label: string; value: string }[];
  images: DocImage[];
  /** Attached documents that can't be shown inline (PDFs etc.), by name. */
  files: string[];
  /** Free text (letters, wishes…) shown as a paragraph. */
  body?: string;
}

export interface DocSection {
  slug: string;
  title: string;
  hint: string | null;
  blocks: DocBlock[];
}

export interface DocGroup {
  title: string;
  sections: DocSection[];
}

export interface PlannerDocument {
  ownerName: string;
  /** Set for a shared document: the trusted person it was shared with. */
  preparedFor: string | null;
  generatedAt: Date;
  groups: DocGroup[];
}

const INLINE_IMAGE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function nameOf(u: Pick<UserRow, "first_name" | "last_name" | "name" | "email"> | null): string {
  if (!u) return "";
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.name || u.email || "";
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

const grantKey = (kind: string, subcategoryId: string | null, itemId: string) =>
  `${kind}|${subcategoryId ?? ""}|${itemId}`;

export async function loadPlannerDocument(input: {
  ownerUserId: string;
  /** Only include what the owner has shared with this person. */
  granteeUserId?: string;
}): Promise<PlannerDocument> {
  const supabase = createServiceClient();
  const owner = await findUserById(input.ownerUserId);
  if (!owner) throw new Error("owner_not_found");
  const ownerId = owner.id;

  // Which items may appear. Null = everything (the owner's own print).
  let allowed: Set<string> | null = null;
  let preparedFor: string | null = null;
  if (input.granteeUserId) {
    const grantee = await findUserById(input.granteeUserId);
    preparedFor = nameOf(grantee) || "Trusted person";
    const grants = (await listGrantsByOwner(ownerId)).filter(
      (g) => g.grantee_user_id === input.granteeUserId
    );
    allowed = new Set(grants.map((g) => grantKey(g.item_kind, g.subcategory_id, g.item_id)));
  }
  const may = (kind: string, sub: string | null, id: string) =>
    allowed === null || allowed.has(grantKey(kind, sub, id));
  const mayKind = (kind: string) =>
    allowed === null || Array.from(allowed).some((k) => k.startsWith(`${kind}|`));

  const folderIds = PLANNER_SECTIONS.filter((s) => s.kind === "organiser" && s.organiserSubcategoryId).map(
    (s) => s.organiserSubcategoryId as string
  );

  const [{ data: qData }, { data: subData }, { data: recData }, { data: fileData }] = await Promise.all([
    supabase
      .from("page_questions")
      .select("*")
      .in("subcategory_id", folderIds)
      .order("row_order")
      .order("col_start"),
    supabase.from("subcategories").select("id, repeatable").in("id", folderIds),
    supabase
      .from("records")
      .select("*")
      .eq("user_id", ownerId)
      .in("subcategory_id", folderIds)
      .order("created_at"),
    supabase
      .from("file_objects")
      .select("*")
      .eq("user_id", ownerId)
      .order("created_at"),
  ]);
  const questions = (qData as PageQuestionRow[]) ?? [];
  const repeatable = new Map(
    ((subData as { id: string; repeatable: boolean }[]) ?? []).map((s) => [s.id, s.repeatable])
  );
  const records = (recData as RecordRow[]) ?? [];
  const files = (fileData as FileRow[]) ?? [];
  const fileById = new Map(files.map((f) => [f.id, f]));
  const questionById = new Map(questions.map((q) => [q.id, q]));

  const { data: respData } =
    questions.length > 0
      ? await supabase
          .from("question_responses")
          .select("question_id, instance_id, value")
          .eq("user_id", ownerId)
          .in(
            "question_id",
            questions.map((q) => q.id)
          )
      : { data: [] };
  const responses = (respData ?? []) as { question_id: string; instance_id: string; value: string | null }[];

  // folder → instance → question → value
  const answers = new Map<string, Map<string, Map<string, string>>>();
  for (const r of responses) {
    if (!r.value) continue;
    const sub = questionById.get(r.question_id)?.subcategory_id;
    if (!sub) continue;
    const byInstance = answers.get(sub) ?? new Map<string, Map<string, string>>();
    const vals = byInstance.get(r.instance_id) ?? new Map<string, string>();
    vals.set(r.question_id, r.value);
    byInstance.set(r.instance_id, vals);
    answers.set(sub, byInstance);
  }

  // Signed links for pictures, made lazily so only included ones are signed.
  async function attachment(f: FileRow, out: DocBlock) {
    if (f.mime_type && INLINE_IMAGE.has(f.mime_type)) {
      try {
        out.images.push({ url: await createSignedDownloadUrl(f.storage_path, 60 * 60), filename: f.filename });
        return;
      } catch {
        /* fall through to listing it by name */
      }
    }
    out.files.push(f.filename);
  }

  async function organiserBlocks(section: PlannerSection): Promise<DocBlock[]> {
    const sub = section.organiserSubcategoryId as string;
    const qs = questions.filter((q) => q.subcategory_id === sub);
    const blocks: DocBlock[] = [];
    const usedFiles = new Set<string>();

    if (qs.length > 0) {
      const isRepeatable = repeatable.get(sub) ?? false;
      const byInstance = answers.get(sub) ?? new Map<string, Map<string, string>>();
      const instanceIds = Array.from(byInstance.keys())
        .filter((id) => (isRepeatable ? id !== "default" : id === "default"))
        .sort((a, b) => Number(a) - Number(b));
      for (const instanceId of instanceIds) {
        const ok = isRepeatable ? may("instance", sub, instanceId) : may("user_form", sub, ownerId);
        if (!ok) continue;
        const vals = byInstance.get(instanceId)!;
        const block: DocBlock = { title: null, fields: [], images: [], files: [] };
        for (const q of qs) {
          const raw = vals.get(q.id);
          if (!raw) continue;
          if (q.question_type === "file" || q.question_type === "image") {
            const f = fileById.get(raw);
            if (f) {
              usedFiles.add(f.id);
              await attachment(f, block);
            }
            continue;
          }
          if (q.question_type === "transactions_json") continue;
          const value = formatQuestionValue(q, raw);
          if (value) block.fields.push({ label: q.label, value });
        }
        // Documents uploaded against this entry.
        for (const f of files) {
          if (f.subcategory_id === sub && f.instance_id === instanceId && !usedFiles.has(f.id)) {
            usedFiles.add(f.id);
            await attachment(f, block);
          }
        }
        if (isRepeatable) block.title = block.fields[0]?.value ?? null;
        if (block.fields.length || block.images.length || block.files.length) blocks.push(block);
      }
    }

    for (const r of records.filter((x) => x.subcategory_id === sub)) {
      if (!may("record", sub, r.id)) continue;
      const block: DocBlock = {
        title: r.title || "Untitled",
        fields: [
          { label: "Expiry", value: fmtDate(r.expiry_date) },
          { label: "Notes", value: r.notes ?? "" },
        ].filter((f) => f.value),
        images: [],
        files: [],
      };
      for (const f of files.filter((x) => x.record_id === r.id)) {
        usedFiles.add(f.id);
        await attachment(f, block);
      }
      blocks.push(block);
    }

    // Folder documents not tied to an entry or record.
    const loose: DocBlock = { title: "Documents", fields: [], images: [], files: [] };
    for (const f of files) {
      if (f.subcategory_id !== sub || usedFiles.has(f.id) || f.record_id) continue;
      if (f.instance_id && !may("instance", sub, f.instance_id) && !may("file", sub, f.id)) continue;
      if (!f.instance_id && !may("file", sub, f.id)) continue;
      await attachment(f, loose);
    }
    if (loose.images.length || loose.files.length) blocks.push(loose);
    return blocks;
  }

  // Planner-only text sections.
  const [letters, apologies, wishes, lastWords] = await Promise.all([
    supabase.from("planner_letters").select("id, recipient, body").eq("user_id", ownerId).order("order_index"),
    supabase.from("planner_apologies").select("id, recipient, body").eq("user_id", ownerId).order("order_index"),
    supabase.from("planner_wishes").select("audience, body").eq("user_id", ownerId),
    supabase.from("planner_last_words").select("body").eq("user_id", ownerId).maybeSingle(),
  ]);
  const text = (body: string, title: string | null = null): DocBlock => ({
    title,
    fields: [],
    images: [],
    files: [],
    body,
  });

  async function plannerOnlyBlocks(section: PlannerSection): Promise<DocBlock[]> {
    const editor = section.plannerEditor ?? "";
    if (editor === "people-self" || editor === "people-family") {
      // Read from the Family Members roster; not shareable item by item.
      if (allowed !== null) return [];
      const people = peopleForEditor(editor, await loadPlannerPeople(ownerId, owner!.family_group_id));
      return people
        .filter((p) => p.fields.length > 0)
        .map((p) => ({ title: p.name, fields: p.fields, images: [], files: [] }));
    }
    if (editor.startsWith("wishes-")) {
      const audience = editor.slice("wishes-".length);
      const row = ((wishes.data ?? []) as { audience: string; body: string }[]).find(
        (w) => w.audience === audience
      );
      if (!row?.body?.trim() || !may("planner_wish", null, audience)) return [];
      return [text(row.body)];
    }
    if (editor === "letters") {
      return ((letters.data ?? []) as { id: number; recipient: string | null; body: string }[])
        .filter((l) => l.body?.trim() && may("planner_letter", null, String(l.id)))
        .map((l) => text(l.body, `Dear ${l.recipient || "…"}`));
    }
    if (editor === "apologies") {
      return ((apologies.data ?? []) as { id: number; recipient: string | null; body: string }[])
        .filter((a) => a.body?.trim() && may("planner_apology", null, String(a.id)))
        .map((a) => text(a.body, `To ${a.recipient || "…"}`));
    }
    if (editor === "last-words") {
      const body = (lastWords.data as { body: string } | null)?.body;
      if (!body?.trim() || !mayKind("planner_last_words")) return [];
      return [text(body)];
    }
    return [];
  }

  const groups: DocGroup[] = [];
  for (const section of PLANNER_SECTIONS) {
    const blocks =
      section.kind === "organiser" && section.organiserSubcategoryId
        ? await organiserBlocks(section)
        : await plannerOnlyBlocks(section);
    if (blocks.length === 0) continue;
    let group = groups[groups.length - 1];
    if (!group || group.title !== section.group) {
      group = { title: section.group, sections: [] };
      groups.push(group);
    }
    group.sections.push({ slug: section.slug, title: section.title, hint: section.hint ?? null, blocks });
  }

  return { ownerName: nameOf(owner), preparedFor, generatedAt: new Date(), groups };
}
