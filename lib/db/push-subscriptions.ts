import { createServiceClient } from "@/lib/supabase/server";

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  last_used_at: string;
}

export async function upsertPushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent ?? null,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) throw error;
}

export async function deletePushSubscription(
  userId: string,
  endpoint: string
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
  if (error) throw error;
}

export async function listPushSubscriptionsForUser(
  userId: string
): Promise<PushSubscriptionRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data as PushSubscriptionRow[] | null) ?? [];
}

export async function listAllPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("push_subscriptions").select("*");
  if (error) throw error;
  return (data as PushSubscriptionRow[] | null) ?? [];
}

export async function markPushAsked(userId: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("users")
    .update({ push_asked_at: new Date().toISOString() })
    .eq("id", userId);
}
