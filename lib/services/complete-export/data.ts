import { createServiceClient } from "@/lib/supabase/server";
import { listUsersInFamilyGroup } from "@/lib/db/users";
import { getFamilyGroup } from "@/lib/db/family-groups";
import { formatQuestionValue } from "@/lib/services/format-question-value";
import {
  CATEGORY_LABELS,
  type CategoryId,
  type FileRow,
  type PageQuestionRow,
  type RecordRow,
  type SubcategoryRow,
  type UserRow,
} from "@/lib/db/types";

// Gathers everything in a family's organiser for the complete download:
// every folder's answers (per person, per entry), records, uploaded files,
// the Planner's written sections and receipts. Folders and people with
// nothing filled in are left out, so the download only shows real content.

export interface ExportField {
  label: string;
  value: string;
}

export interface ExportEntry {
  /** Shown above the entry when a folder holds several (repeater / records). */
  title: string | null;
  fields: ExportField[];
  /** Paths inside the zip of documents attached to this entry. */
  documents: string[];
}

export interface ExportPersonBlock {
  personName: string;
  entries: ExportEntry[];
}

export interface ExportFolder {
  id: string;
  name: string;
  hint: string | null;
  people: ExportPersonBlock[];
  /** Folder-wide documents not tied to one entry, as zip paths. */
  documents: string[];
  /** Column order for the workbook tab. */
  columns: string[];
}

export interface ExportCategory {
  id: CategoryId;
  label: string;
  folders: ExportFolder[];
}

export interface ExportPlannerItem {
  heading: string;
  body: string;
}

export interface ExportPlannerPerson {
  personName: string;
  items: ExportPlannerItem[];
}

export interface ExportReceipt {
  personName: string;
  date: string;
  financialYear: string;
  supplier: string;
  description: string;
  category: string;
  amount: number;
  gst: number | null;
  deductible: number | null;
  document: string | null;
}

export interface ExportFile {
  storagePath: string;
  zipPath: string;
}

export interface CompleteExportData {
  familyName: string;
  generatedAt: Date;
  people: { id: string; name: string }[];
  categories: ExportCategory[];
  planner: ExportPlannerPerson[];
  receipts: ExportReceipt[];
  files: ExportFile[];
}

const CATEGORY_ORDER: CategoryId[] = ["personal", "health", "education", "employment", "admin"];

const WISH_TITLES: Record<string, string> = {
  general: "My wishes",
  spouse: "Wishes for my spouse / partner",
  children: "Wishes for my children",
  relatives: "Wishes for my relatives",
  friends: "Wishes for my friends",
  pets: "Wishes for my pets",
  other: "Other wishes",
};

function personName(u: Pick<UserRow, "first_name" | "last_name" | "name" | "email">): string {
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.name || u.email || "Family member";
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

/** Characters that are unsafe in file and folder names inside a zip. */
function safeName(s: string): string {
  return s.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 80) || "Untitled";
}

/** Supabase returns at most 1000 rows per request — page through. */
async function fetchAll<T>(
  run: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>
): Promise<T[]> {
  const out: T[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await run(from, from + page - 1);
    if (error) throw error;
    const rows = (data as T[]) ?? [];
    out.push(...rows);
    if (rows.length < page) return out;
  }
}

export async function loadCompleteExport(familyGroupId: string): Promise<CompleteExportData> {
  const supabase = createServiceClient();
  const [group, users] = await Promise.all([
    getFamilyGroup(familyGroupId),
    listUsersInFamilyGroup(familyGroupId),
  ]);
  const userIds = users.map((u) => u.id);
  const nameById = new Map(users.map((u) => [u.id, personName(u)]));
  const people = users.map((u) => ({ id: u.id, name: personName(u) }));
  const empty: CompleteExportData = {
    familyName: group?.name ?? "",
    generatedAt: new Date(),
    people,
    categories: [],
    planner: [],
    receipts: [],
    files: [],
  };
  if (userIds.length === 0) return empty;

  // Standard folders plus anyone's custom folders.
  const folders = (
    await fetchAll<SubcategoryRow>((a, b) =>
      supabase
        .from("subcategories")
        .select("*")
        .is("template_group", null)
        .or(`user_id.is.null,user_id.in.(${userIds.join(",")})`)
        .order("sort_order", { ascending: true })
        .range(a, b)
    )
  ).filter((f) => CATEGORY_ORDER.includes(f.category_id));
  const folderIds = folders.map((f) => f.id);

  const [questions, responses, records, files, letters, apologies, wishes, lastWords, receipts] =
    await Promise.all([
      fetchAll<PageQuestionRow>((a, b) =>
        supabase
          .from("page_questions")
          .select("*")
          .in("subcategory_id", folderIds)
          .order("row_order", { ascending: true })
          .order("col_start", { ascending: true })
          .range(a, b)
      ),
      fetchAll<{ user_id: string; question_id: string; instance_id: string; value: string | null }>(
        (a, b) =>
          supabase
            .from("question_responses")
            .select("user_id, question_id, instance_id, value")
            .in("user_id", userIds)
            .order("user_id")
            .order("question_id")
            .order("instance_id")
            .range(a, b)
      ),
      fetchAll<RecordRow & { fields?: { label: string; value: string }[] | null }>((a, b) =>
        supabase.from("records").select("*").in("user_id", userIds).order("created_at").range(a, b)
      ),
      fetchAll<FileRow>((a, b) =>
        supabase.from("file_objects").select("*").in("user_id", userIds).order("created_at").range(a, b)
      ),
      fetchAll<{ user_id: string; recipient: string; body: string }>((a, b) =>
        supabase
          .from("planner_letters")
          .select("user_id, recipient, body")
          .in("user_id", userIds)
          .order("order_index")
          .range(a, b)
      ),
      fetchAll<{ user_id: string; recipient: string; body: string }>((a, b) =>
        supabase
          .from("planner_apologies")
          .select("user_id, recipient, body")
          .in("user_id", userIds)
          .order("order_index")
          .range(a, b)
      ),
      fetchAll<{ user_id: string; audience: string; body: string }>((a, b) =>
        supabase.from("planner_wishes").select("user_id, audience, body").in("user_id", userIds).range(a, b)
      ),
      fetchAll<{ user_id: string; body: string }>((a, b) =>
        supabase.from("planner_last_words").select("user_id, body").in("user_id", userIds).range(a, b)
      ),
      fetchAll<{
        user_id: string;
        receipt_date: string;
        financial_year: string;
        supplier: string | null;
        description: string | null;
        category: string | null;
        amount: number;
        gst_amount: number | null;
        deductible_amount: number | null;
        file_path: string | null;
      }>((a, b) =>
        supabase
          .from("receipts")
          .select(
            "user_id, receipt_date, financial_year, supplier, description, category, amount, gst_amount, deductible_amount, file_path"
          )
          .in("user_id", userIds)
          .order("receipt_date")
          .range(a, b)
      ),
    ]);

  const folderById = new Map(folders.map((f) => [f.id, f]));
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const questionsByFolder = new Map<string, PageQuestionRow[]>();
  for (const q of questions) {
    if (!q.subcategory_id) continue;
    const arr = questionsByFolder.get(q.subcategory_id) ?? [];
    arr.push(q);
    questionsByFolder.set(q.subcategory_id, arr);
  }

  // ---- Documents: give every uploaded file a tidy, unique path in the zip.
  const exportFiles: ExportFile[] = [];
  const zipPathByFileId = new Map<string, string>();
  const usedPaths = new Set<string>();
  function claim(path: string): string {
    let p = path;
    const dot = path.lastIndexOf(".");
    const stem = dot > path.lastIndexOf("/") ? path.slice(0, dot) : path;
    const ext = dot > path.lastIndexOf("/") ? path.slice(dot) : "";
    for (let n = 2; usedPaths.has(p.toLowerCase()); n++) p = `${stem} (${n})${ext}`;
    usedPaths.add(p.toLowerCase());
    return p;
  }
  const recordById = new Map(records.map((r) => [r.id, r]));
  for (const f of files) {
    const folder =
      (f.subcategory_id && folderById.get(f.subcategory_id)) ||
      (f.record_id && recordById.get(f.record_id)?.subcategory_id
        ? folderById.get(recordById.get(f.record_id)!.subcategory_id!)
        : undefined);
    const dir = folder
      ? `Documents/${safeName(CATEGORY_LABELS[folder.category_id])}/${safeName(folder.name)}`
      : "Documents/Other";
    const zipPath = claim(`${dir}/${safeName(nameById.get(f.user_id) ?? "")} - ${safeName(f.filename)}`);
    zipPathByFileId.set(f.id, zipPath);
    exportFiles.push({ storagePath: f.storage_path, zipPath });
  }

  // ---- Answers grouped by folder → person → entry.
  type Answers = Map<string, string>; // question_id → value
  const byFolderUserInstance = new Map<string, Map<string, Map<string, Answers>>>();
  for (const r of responses) {
    if (!r.value) continue;
    const q = questionById.get(r.question_id);
    if (!q?.subcategory_id) continue;
    const perFolder = byFolderUserInstance.get(q.subcategory_id) ?? new Map();
    const perUser = perFolder.get(r.user_id) ?? new Map();
    const answers: Answers = perUser.get(r.instance_id) ?? new Map();
    answers.set(r.question_id, r.value);
    perUser.set(r.instance_id, answers);
    perFolder.set(r.user_id, perUser);
    byFolderUserInstance.set(q.subcategory_id, perFolder);
  }

  // Label for a linked_entry value (an entry in another folder).
  function linkedLabel(q: PageQuestionRow, userId: string, instanceId: string): string {
    const perFolder = q.linked_subcategory_id ? byFolderUserInstance.get(q.linked_subcategory_id) : undefined;
    const answers =
      perFolder?.get(userId)?.get(instanceId) ??
      Array.from(perFolder?.values() ?? []).find((m) => m.has(instanceId))?.get(instanceId);
    if (!answers) return "";
    return q.linked_label_fields
      .map((id) => {
        const v = answers.get(id);
        return v ? formatQuestionValue(questionById.get(id), v) : "";
      })
      .filter(Boolean)
      .join(" ");
  }

  function displayValue(q: PageQuestionRow, raw: string, userId: string): string {
    switch (q.question_type) {
      case "image":
      case "file": {
        const path = zipPathByFileId.get(raw);
        return path ? `See ${path}` : "";
      }
      case "linked_entry":
        return linkedLabel(q, userId, raw);
      case "transactions_json": {
        try {
          const rows = (JSON.parse(raw) as { rows?: unknown[] }).rows ?? [];
          return rows.length ? `${rows.length} transactions` : "";
        } catch {
          return "";
        }
      }
      case "datetime":
        return fmtDate(raw);
      default:
        return formatQuestionValue(q, raw);
    }
  }

  const filesByFolderInstance = new Map<string, string[]>(); // `${folder}|${user}|${instance}`
  const filesByFolder = new Map<string, string[]>();
  const filesByRecord = new Map<string, string[]>();
  const fieldFileIds = new Set(
    responses.filter((r) => {
      const t = questionById.get(r.question_id)?.question_type;
      return (t === "file" || t === "image") && r.value;
    }).map((r) => r.value as string)
  );
  for (const f of files) {
    const path = zipPathByFileId.get(f.id)!;
    if (f.record_id) {
      filesByRecord.set(f.record_id, [...(filesByRecord.get(f.record_id) ?? []), path]);
    } else if (fieldFileIds.has(f.id)) {
      // Already shown as a field value.
    } else if (f.subcategory_id && f.instance_id) {
      const k = `${f.subcategory_id}|${f.user_id}|${f.instance_id}`;
      filesByFolderInstance.set(k, [...(filesByFolderInstance.get(k) ?? []), path]);
    } else if (f.subcategory_id) {
      filesByFolder.set(f.subcategory_id, [...(filesByFolder.get(f.subcategory_id) ?? []), path]);
    }
  }

  const userOrder = new Map(userIds.map((id, i) => [id, i]));
  const categories: ExportCategory[] = [];
  for (const catId of CATEGORY_ORDER) {
    const out: ExportFolder[] = [];
    for (const folder of folders.filter((f) => f.category_id === catId)) {
      const qs = questionsByFolder.get(folder.id) ?? [];
      const blocks = new Map<string, ExportEntry[]>(); // userId → entries
      let columns: string[] = [];

      if (qs.length > 0) {
        columns = qs.map((q) => q.label);
        const perFolder = byFolderUserInstance.get(folder.id) ?? new Map<string, Map<string, Answers>>();
        for (const [userId, instances] of perFolder) {
          const ids = Array.from(instances.keys())
            .filter((id) => (folder.repeatable ? id !== "default" : true))
            .sort((a, b) => (a === "default" ? -1 : b === "default" ? 1 : Number(a) - Number(b)));
          for (const instanceId of ids) {
            const answers = instances.get(instanceId)!;
            const fields = qs
              .map((q) => ({ label: q.label, value: answers.has(q.id) ? displayValue(q, answers.get(q.id)!, userId) : "" }))
              .filter((f) => f.value);
            const documents = filesByFolderInstance.get(`${folder.id}|${userId}|${instanceId}`) ?? [];
            if (fields.length === 0 && documents.length === 0) continue;
            const title = folder.repeatable
              ? (fields.find((f) => !f.value.startsWith("See Documents/"))?.value ?? null)
              : null;
            blocks.set(userId, [...(blocks.get(userId) ?? []), { title, fields, documents }]);
          }
        }
      } else {
        columns = ["Title", "Expiry", "Notes", "Tags"];
        for (const r of records.filter((x) => x.subcategory_id === folder.id)) {
          const fields: ExportField[] = [
            { label: "Expiry", value: fmtDate(r.expiry_date) },
            { label: "Notes", value: r.notes ?? "" },
            { label: "Tags", value: (r.tags ?? []).join(", ") },
            ...((Array.isArray(r.fields) ? r.fields : []) as { label: string; value: string }[]).map((f) => ({
              label: f.label,
              value: f.value,
            })),
          ].filter((f) => f.value);
          for (const f of fields) if (!columns.includes(f.label)) columns.push(f.label);
          blocks.set(r.user_id, [
            ...(blocks.get(r.user_id) ?? []),
            { title: r.title || "Untitled", fields, documents: filesByRecord.get(r.id) ?? [] },
          ]);
        }
      }

      const folderDocs = filesByFolder.get(folder.id) ?? [];
      if (blocks.size === 0 && folderDocs.length === 0) continue;
      out.push({
        id: folder.id,
        name: folder.name,
        hint: folder.hint,
        documents: folderDocs,
        columns,
        people: Array.from(blocks.entries())
          .sort(([a], [b]) => (userOrder.get(a) ?? 0) - (userOrder.get(b) ?? 0))
          .map(([userId, entries]) => ({ personName: nameById.get(userId) ?? "", entries })),
      });
    }
    if (out.length > 0) categories.push({ id: catId, label: CATEGORY_LABELS[catId], folders: out });
  }

  // ---- Planner: the written sections (folder-linked Planner sections are
  // already covered by the organiser folders above).
  const planner: ExportPlannerPerson[] = [];
  for (const u of users) {
    const items: ExportPlannerItem[] = [
      ...wishes
        .filter((w) => w.user_id === u.id && w.body?.trim())
        .map((w) => ({ heading: WISH_TITLES[w.audience] ?? "Wishes", body: w.body })),
      ...letters
        .filter((l) => l.user_id === u.id && l.body?.trim())
        .map((l) => ({ heading: `Letter — Dear ${l.recipient || "…"}`, body: l.body })),
      ...apologies
        .filter((a) => a.user_id === u.id && a.body?.trim())
        .map((a) => ({ heading: `Apology — To ${a.recipient || "…"}`, body: a.body })),
      ...lastWords
        .filter((w) => w.user_id === u.id && w.body?.trim())
        .map((w) => ({ heading: "My last words", body: w.body })),
    ];
    if (items.length > 0) planner.push({ personName: personName(u), items });
  }

  // ---- Receipts (their photos go under Documents/Receipts/<year>).
  const exportReceipts: ExportReceipt[] = receipts.map((r) => {
    let document: string | null = null;
    if (r.file_path) {
      const base = r.file_path.split("/").pop() ?? "receipt";
      document = claim(
        `Documents/Receipts/${safeName(r.financial_year)}/${r.receipt_date} ${safeName(r.supplier ?? "Receipt")} - ${safeName(base)}`
      );
      exportFiles.push({ storagePath: r.file_path, zipPath: document });
    }
    return {
      personName: nameById.get(r.user_id) ?? "",
      date: fmtDate(r.receipt_date),
      financialYear: r.financial_year,
      supplier: r.supplier ?? "",
      description: r.description ?? "",
      category: r.category ?? "",
      amount: Number(r.amount),
      gst: r.gst_amount == null ? null : Number(r.gst_amount),
      deductible: r.deductible_amount == null ? null : Number(r.deductible_amount),
      document,
    };
  });

  return { ...empty, categories, planner, receipts: exportReceipts, files: exportFiles };
}
