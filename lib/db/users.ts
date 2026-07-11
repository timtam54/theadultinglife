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

function initialRoleFor(email: string, name: string | null | undefined): "u" | "s" {
  const haystack = `${email} ${name ?? ""}`.toLowerCase();
  return haystack.includes("donna") ? "s" : "u";
}

function guessFirstName(name: string | null | undefined, email: string): string {
  if (name && name.trim()) return name.trim().split(/\s+/)[0];
  return email.split("@")[0];
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

  const firstName = guessFirstName(input.name, input.email);
  const familyGroupName = `${firstName}'s Family`;

  const { data: group, error: groupError } = await supabase
    .from("family_groups")
    .insert({ name: familyGroupName })
    .select("*")
    .single();
  if (groupError || !group) throw groupError ?? new Error("createUser: family_group insert failed");

  const { data, error } = await supabase
    .from("users")
    .insert({
      family_group_id: group.id,
      email: input.email.toLowerCase(),
      name: input.name ?? null,
      first_name: firstName,
      avatar_url: input.avatarUrl ?? null,
      auth_provider: input.authProvider ?? null,
      auth_provider_id: input.authProviderId ?? null,
      password_hash: input.passwordHash ?? null,
      role: initialRoleFor(input.email, input.name),
      member_kind: "adult",
      is_primary: true,
      order_index: 0,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("createUser failed");
  return data as UserRow;
}

export async function listAllUsers(): Promise<UserRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as UserRow[] | null) ?? [];
}

export async function isUserInFamilyGroup(
  userId: string,
  familyGroupId: string
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .eq("family_group_id", familyGroupId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function listUsersInFamilyGroup(
  familyGroupId: string
): Promise<UserRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("family_group_id", familyGroupId)
    .order("is_primary", { ascending: false })
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as UserRow[] | null) ?? [];
}

export async function insertFamilyUser(input: {
  familyGroupId: string;
  firstName: string;
  lastName?: string | null;
  memberKind: "adult" | "child" | "other";
  email?: string | null;
  orderIndex?: number;
}): Promise<UserRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .insert({
      family_group_id: input.familyGroupId,
      first_name: input.firstName,
      last_name: input.lastName ?? null,
      name: [input.firstName, input.lastName].filter(Boolean).join(" "),
      email: input.email ? input.email.toLowerCase() : null,
      member_kind: input.memberKind,
      role: "u",
      is_primary: false,
      order_index: input.orderIndex ?? 0,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("insertFamilyUser failed");
  return data as UserRow;
}

export async function updateFamilyUser(
  id: string,
  familyGroupId: string,
  patch: {
    firstName?: string;
    lastName?: string | null;
    memberKind?: "adult" | "child" | "other";
    email?: string | null;
    orderIndex?: number;
  }
): Promise<UserRow> {
  const supabase = createServiceClient();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.firstName !== undefined) update.first_name = patch.firstName;
  if (patch.lastName !== undefined) update.last_name = patch.lastName;
  if (patch.memberKind !== undefined) update.member_kind = patch.memberKind;
  if (patch.email !== undefined) update.email = patch.email ? patch.email.toLowerCase() : null;
  if (patch.orderIndex !== undefined) update.order_index = patch.orderIndex;
  if (patch.firstName !== undefined || patch.lastName !== undefined) {
    const { data: current } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", id)
      .maybeSingle();
    const first = patch.firstName ?? (current?.first_name as string | null) ?? "";
    const last = patch.lastName ?? (current?.last_name as string | null) ?? "";
    update.name = [first, last].filter(Boolean).join(" ");
  }
  const { data, error } = await supabase
    .from("users")
    .update(update)
    .eq("id", id)
    .eq("family_group_id", familyGroupId)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("updateFamilyUser failed");
  return data as UserRow;
}

export async function deleteFamilyUser(
  id: string,
  familyGroupId: string
): Promise<void> {
  const supabase = createServiceClient();
  const { data: row, error: readError } = await supabase
    .from("users")
    .select("is_primary")
    .eq("id", id)
    .eq("family_group_id", familyGroupId)
    .maybeSingle();
  if (readError) throw readError;
  if (!row) return;
  if ((row as { is_primary: boolean }).is_primary) {
    throw new Error("cannot_delete_primary");
  }
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", id)
    .eq("family_group_id", familyGroupId);
  if (error) throw error;
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
