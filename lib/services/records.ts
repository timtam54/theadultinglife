import {
  createRecord,
  deleteRecord,
  getRecord,
  listRecords,
  updateRecord,
} from "@/lib/db/records";
import {
  CATEGORY_IDS,
  type CategoryId,
  type RecordField,
  type RecordRow,
  type RecordStatus,
} from "@/lib/db/types";

const EXPIRING_SOON_DAYS = 30;

export function computeStatus(expiryDate: string | null): RecordStatus | null {
  if (!expiryDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((exp.getTime() - now.getTime()) / 86_400_000);
  if (diffDays < 0) return "expired";
  if (diffDays <= EXPIRING_SOON_DAYS) return "expiring_soon";
  return "active";
}

export function isCategoryId(x: unknown): x is CategoryId {
  return typeof x === "string" && (CATEGORY_IDS as readonly string[]).includes(x);
}

export interface RecordView extends RecordRow {
  status: RecordStatus | null;
}

function withStatus(row: RecordRow): RecordView {
  return { ...row, status: computeStatus(row.expiry_date) };
}

export async function listUserRecords(
  userId: string,
  opts?: { categoryId?: CategoryId; search?: string }
): Promise<RecordView[]> {
  const rows = await listRecords(userId, opts);
  return rows.map(withStatus);
}

export async function getUserRecord(
  userId: string,
  id: string
): Promise<RecordView | null> {
  const row = await getRecord(userId, id);
  return row ? withStatus(row) : null;
}

function normaliseFields(input: unknown): RecordField[] {
  if (!Array.isArray(input)) return [];
  const out: RecordField[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const f = raw as Partial<RecordField>;
    if (!f.key || !f.label) continue;
    const type: RecordField["type"] =
      f.type === "date" || f.type === "number" ? f.type : "text";
    out.push({
      key: String(f.key),
      label: String(f.label),
      type,
      value: typeof f.value === "string" ? f.value : "",
    });
  }
  return out;
}

export async function createUserRecord(
  userId: string,
  input: {
    categoryId: unknown;
    title: unknown;
    fields: unknown;
    expiryDate?: unknown;
    notes?: unknown;
  }
): Promise<RecordView> {
  if (!isCategoryId(input.categoryId)) throw new Error("Invalid category");
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) throw new Error("Title is required");
  const row = await createRecord({
    userId,
    categoryId: input.categoryId,
    title,
    fields: normaliseFields(input.fields),
    expiryDate: typeof input.expiryDate === "string" && input.expiryDate ? input.expiryDate : null,
    notes: typeof input.notes === "string" ? input.notes : null,
  });
  return withStatus(row);
}

export async function updateUserRecord(
  userId: string,
  id: string,
  input: {
    title?: unknown;
    fields?: unknown;
    expiryDate?: unknown;
    notes?: unknown;
    categoryId?: unknown;
  }
): Promise<RecordView> {
  const patch: Parameters<typeof updateRecord>[2] = {};
  if (typeof input.title === "string") patch.title = input.title.trim();
  if (input.fields !== undefined) patch.fields = normaliseFields(input.fields);
  if (input.expiryDate !== undefined) {
    patch.expiry_date =
      typeof input.expiryDate === "string" && input.expiryDate ? input.expiryDate : null;
  }
  if (input.notes !== undefined) {
    patch.notes = typeof input.notes === "string" ? input.notes : null;
  }
  if (input.categoryId !== undefined) {
    if (!isCategoryId(input.categoryId)) throw new Error("Invalid category");
    patch.category_id = input.categoryId;
  }
  const row = await updateRecord(userId, id, patch);
  return withStatus(row);
}

export async function deleteUserRecord(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, id);
}
