import { createServiceClient } from "@/lib/supabase/server";

// Devices a person has turned on Face ID / fingerprint unlock for
// (migration 186). Public keys only — no biometric data is ever stored.

export interface PasskeyRow {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string[];
  device_label: string | null;
  created_at: string;
  last_used_at: string | null;
}

export async function listPasskeys(userId: string): Promise<PasskeyRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("user_passkeys")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as PasskeyRow[]) ?? [];
}

export async function countPasskeys(userId: string): Promise<number> {
  const supabase = createServiceClient();
  const { count, error } = await supabase
    .from("user_passkeys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}

export async function insertPasskey(input: {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string[];
  deviceLabel: string | null;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("user_passkeys").insert({
    user_id: input.userId,
    credential_id: input.credentialId,
    public_key: input.publicKey,
    counter: input.counter,
    transports: input.transports,
    device_label: input.deviceLabel,
  });
  if (error) throw error;
}

export async function markPasskeyUsed(id: string, counter: number): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("user_passkeys")
    .update({ counter, last_used_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deletePasskey(userId: string, id: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("user_passkeys")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}
