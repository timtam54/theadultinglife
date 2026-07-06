import { createServiceClient } from "@/lib/supabase/server";
import type { UserRow } from "./types";

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return (data as UserRow | null) ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as UserRow | null) ?? null;
}

export async function findUserByPasswordTokenHash(
  tokenHash: string
): Promise<UserRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("password_set_token_hash", tokenHash)
    .maybeSingle();
  if (error) throw error;
  return (data as UserRow | null) ?? null;
}

export async function createUser(input: {
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  authProvider?: string | null;
  authProviderId?: string | null;
  passwordHash?: string | null;
}): Promise<UserRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .insert({
      email: input.email.toLowerCase(),
      name: input.name ?? null,
      avatar_url: input.avatarUrl ?? null,
      auth_provider: input.authProvider ?? null,
      auth_provider_id: input.authProviderId ?? null,
      password_hash: input.passwordHash ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("createUser failed");
  return data as UserRow;
}

export async function updateUser(
  id: string,
  patch: Partial<
    Pick<
      UserRow,
      | "name"
      | "avatar_url"
      | "auth_provider"
      | "auth_provider_id"
      | "password_hash"
      | "password_set_token_hash"
      | "password_set_expires_at"
    >
  >
): Promise<UserRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("updateUser failed");
  return data as UserRow;
}
