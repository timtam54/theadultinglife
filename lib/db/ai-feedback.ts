import { createServiceClient } from "@/lib/supabase/server";

export interface AiFeedbackRow {
  id: string;
  user_id: string;
  kind: "unhelpful_or_unsafe";
  message_id: string | null;
  message_text: string | null;
  note: string | null;
  created_at: string;
}

export async function insertAiFeedback(input: {
  userId: string;
  kind: "unhelpful_or_unsafe";
  messageId: string | null;
  messageText: string | null;
  note: string | null;
}): Promise<AiFeedbackRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ai_feedback")
    .insert({
      user_id: input.userId,
      kind: input.kind,
      message_id: input.messageId,
      message_text: input.messageText,
      note: input.note,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("insertAiFeedback failed");
  return data as AiFeedbackRow;
}

export async function listRecentAiFeedback(
  limit = 200
): Promise<AiFeedbackRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("ai_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as AiFeedbackRow[] | null) ?? [];
}
