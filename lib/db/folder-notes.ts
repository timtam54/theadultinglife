import { createServiceClient } from "@/lib/supabase/server";

export interface FolderNoteRow {
  id: string;
  family_group_id: string;
  subcategory_id: string;
  body: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getFolderNote(
  familyGroupId: string,
  subcategoryId: string
): Promise<FolderNoteRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("folder_notes")
    .select("*")
    .eq("family_group_id", familyGroupId)
    .eq("subcategory_id", subcategoryId)
    .maybeSingle();
  if (error) throw error;
  return (data as FolderNoteRow | null) ?? null;
}

export async function upsertFolderNote(input: {
  familyGroupId: string;
  subcategoryId: string;
  body: string;
  userId: string;
}): Promise<FolderNoteRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("folder_notes")
    .upsert(
      {
        family_group_id: input.familyGroupId,
        subcategory_id: input.subcategoryId,
        body: input.body,
        updated_by: input.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "family_group_id,subcategory_id" }
    )
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("upsertFolderNote failed");
  return data as FolderNoteRow;
}
