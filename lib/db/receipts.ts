import { createServiceClient } from "@/lib/supabase/server";

export interface ReceiptRow {
  id: string;
  user_id: string;
  receipt_date: string;
  financial_year: string;
  month: number;
  supplier: string | null;
  abn: string | null;
  description: string | null;
  category: string | null;
  business_purpose: string | null;
  amount: number;
  gst_amount: number | null;
  gst_claimable: boolean | null;
  payment_method: string | null;
  invoice_number: string | null;
  is_asset: boolean;
  work_related_percent: number | null;
  deductible_amount: number;
  file_path: string | null;
  file_mime: string | null;
  file_size_bytes: number | null;
  notes: string | null;
  ai_confidence: "high" | "medium" | "low" | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptInsert {
  user_id: string;
  receipt_date: string;
  financial_year: string;
  month: number;
  supplier?: string | null;
  abn?: string | null;
  description?: string | null;
  category?: string | null;
  business_purpose?: string | null;
  amount: number;
  gst_amount?: number | null;
  gst_claimable?: boolean | null;
  payment_method?: string | null;
  invoice_number?: string | null;
  is_asset?: boolean;
  work_related_percent?: number | null;
  file_path?: string | null;
  file_mime?: string | null;
  file_size_bytes?: number | null;
  notes?: string | null;
  ai_confidence?: "high" | "medium" | "low" | null;
}

export type ReceiptUpdate = Partial<Omit<ReceiptInsert, "user_id">>;

export async function insertReceipt(row: ReceiptInsert): Promise<ReceiptRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("receipts")
    .insert(row)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("insertReceipt failed");
  return data as ReceiptRow;
}

export async function listReceipts(
  userId: string,
  opts?: { financialYear?: string; month?: number }
): Promise<ReceiptRow[]> {
  const supabase = createServiceClient();
  let q = supabase.from("receipts").select("*").eq("user_id", userId);
  if (opts?.financialYear) q = q.eq("financial_year", opts.financialYear);
  if (opts?.month) q = q.eq("month", opts.month);
  const { data, error } = await q.order("receipt_date", { ascending: false });
  if (error) throw error;
  return (data as ReceiptRow[]) ?? [];
}

export async function getReceipt(
  userId: string,
  id: string
): Promise<ReceiptRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ReceiptRow | null) ?? null;
}

export async function getReceiptsByIds(
  userId: string,
  ids: string[]
): Promise<ReceiptRow[]> {
  if (ids.length === 0) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("user_id", userId)
    .in("id", ids)
    .order("receipt_date", { ascending: true });
  if (error) throw error;
  return (data as ReceiptRow[]) ?? [];
}

export async function updateReceipt(
  userId: string,
  id: string,
  patch: ReceiptUpdate
): Promise<ReceiptRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("receipts")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("updateReceipt failed");
  return data as ReceiptRow;
}

export async function deleteReceipt(userId: string, id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

export async function listFinancialYears(userId: string): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("receipts")
    .select("financial_year")
    .eq("user_id", userId);
  if (error) throw error;
  const set = new Set<string>();
  for (const row of (data as { financial_year: string }[]) ?? []) {
    set.add(row.financial_year);
  }
  return Array.from(set).sort().reverse();
}
