import { createServiceClient } from "@/lib/supabase/server";
import { listUsersInFamilyGroup } from "@/lib/db/users";
import type { CategoryId, FileRow, RecordRow, SubcategoryRow, UserRow } from "@/lib/db/types";

export type MimeGroup = "pdf" | "image" | "other";

export function mimeGroupOf(mime: string | null): MimeGroup {
  if (!mime) return "other";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  return "other";
}

export interface DocumentRow {
  file: FileRow;
  ownerUserId: string;
  ownerName: string;
  categoryId: CategoryId | null;
  subcategoryId: string | null;
  subcategoryName: string | null;
  linkedRecordId: string | null;
  linkedRecordTitle: string | null;
  expiryDate: string | null;
  mimeGroup: MimeGroup;
}

export interface DocumentFilters {
  categoryId?: CategoryId;
  subcategoryId?: string;
  recordId?: string;
  mimeGroup?: MimeGroup;
  addedFrom?: string;
  addedTo?: string;
  expiryFrom?: string;
  expiryTo?: string;
  search?: string;
}

function ownerName(u: UserRow): string {
  return (
    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
    u.name ||
    u.email ||
    "Family member"
  );
}

function inRange(value: string | null, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  if (!value) return false;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

export interface FamilyDocumentsView {
  documents: DocumentRow[];
  subcategories: SubcategoryRow[];
  records: Pick<RecordRow, "id" | "title" | "category_id" | "subcategory_id" | "expiry_date">[];
  users: UserRow[];
  totalUnfiltered: number;
}

export async function listFamilyDocuments(
  familyGroupId: string,
  filters: DocumentFilters = {}
): Promise<FamilyDocumentsView> {
  const supabase = createServiceClient();
  const users = await listUsersInFamilyGroup(familyGroupId);
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) {
    return {
      documents: [],
      subcategories: [],
      records: [],
      users,
      totalUnfiltered: 0,
    };
  }

  const [{ data: filesData, error: filesErr }, subsRes, recordsRes] = await Promise.all([
    supabase
      .from("file_objects")
      .select("*")
      .in("user_id", userIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("subcategories")
      .select("*")
      .is("template_group", null)
      .or(`user_id.is.null,user_id.in.(${userIds.join(",")})`),
    supabase
      .from("records")
      .select("id,title,category_id,subcategory_id,expiry_date,user_id")
      .in("user_id", userIds),
  ]);
  if (filesErr) throw filesErr;
  if (subsRes.error) throw subsRes.error;
  if (recordsRes.error) throw recordsRes.error;

  const files = (filesData ?? []) as FileRow[];
  const subcategories = (subsRes.data ?? []) as SubcategoryRow[];
  const recordsFull = (recordsRes.data ?? []) as (Pick<
    RecordRow,
    "id" | "title" | "category_id" | "subcategory_id" | "expiry_date"
  > & { user_id: string })[];

  const subById = new Map(subcategories.map((s) => [s.id, s]));
  const recordById = new Map(recordsFull.map((r) => [r.id, r]));
  const userNameById = new Map(users.map((u) => [u.id, ownerName(u)]));

  const enriched: DocumentRow[] = files.map((f) => {
    const linked = f.record_id ? recordById.get(f.record_id) ?? null : null;
    const sub = f.subcategory_id
      ? subById.get(f.subcategory_id) ?? null
      : linked?.subcategory_id
        ? subById.get(linked.subcategory_id) ?? null
        : null;
    const category = sub?.category_id ?? linked?.category_id ?? null;
    return {
      file: f,
      ownerUserId: f.user_id,
      ownerName: userNameById.get(f.user_id) ?? "",
      categoryId: category,
      subcategoryId: sub?.id ?? f.subcategory_id ?? null,
      subcategoryName: sub?.name ?? null,
      linkedRecordId: linked?.id ?? null,
      linkedRecordTitle: linked?.title ?? null,
      expiryDate: linked?.expiry_date ?? null,
      mimeGroup: mimeGroupOf(f.mime_type),
    };
  });

  const q = filters.search?.trim().toLowerCase() ?? "";

  const filtered = enriched.filter((d) => {
    if (filters.categoryId && d.categoryId !== filters.categoryId) return false;
    if (filters.subcategoryId && d.subcategoryId !== filters.subcategoryId) return false;
    if (filters.recordId && d.linkedRecordId !== filters.recordId) return false;
    if (filters.mimeGroup && d.mimeGroup !== filters.mimeGroup) return false;
    const addedDate = d.file.created_at.slice(0, 10);
    if (!inRange(addedDate, filters.addedFrom, filters.addedTo)) return false;
    if (!inRange(d.expiryDate, filters.expiryFrom, filters.expiryTo)) return false;
    if (q) {
      const hay = `${d.file.filename} ${d.subcategoryName ?? ""} ${d.linkedRecordTitle ?? ""} ${d.ownerName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return {
    documents: filtered,
    subcategories,
    records: recordsFull.map(({ user_id: _u, ...rest }) => {
      void _u;
      return rest;
    }),
    users,
    totalUnfiltered: enriched.length,
  };
}
