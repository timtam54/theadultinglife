// Shared service-layer logic for OAuth sign-in / linking.
// Route handlers stay thin: exchange the code (provider lib), then call this.

import { createUser, findUserByEmail, updateUser } from "@/lib/db/users";
import type { UserRow } from "@/lib/db/types";

export async function upsertOAuthUser(input: {
  provider: "google" | "microsoft" | "apple";
  providerId: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
}): Promise<UserRow> {
  if (!input.email) {
    throw new Error("Provider did not return an email address");
  }
  const existing = await findUserByEmail(input.email);
  if (existing) {
    // Update provider linkage / freshen name+avatar if missing.
    return updateUser(existing.id, {
      auth_provider: existing.auth_provider ?? input.provider,
      auth_provider_id: existing.auth_provider_id ?? input.providerId,
      name: existing.name ?? input.name,
      avatar_url: existing.avatar_url ?? input.avatarUrl ?? null,
    });
  }
  return createUser({
    email: input.email,
    name: input.name,
    avatarUrl: input.avatarUrl ?? null,
    authProvider: input.provider,
    authProviderId: input.providerId,
  });
}
