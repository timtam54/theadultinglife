import { NextRequest, NextResponse } from "next/server";
import { getEffectiveAdmin } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/server";
import { invalidatePrioritySubcategoryCache } from "@/lib/services/folder-completion";
import { apiError } from "@/lib/api-error";

// POST /api/admin/subcategories/[id]/priority
// Body: { isPriority: boolean }
// Flips the subcategory's is_priority flag. Priority folders surface in
// the dashboard "Tasks to complete" list and can't be dismissed.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getEffectiveAdmin();
    if (!admin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    const body = (await request.json().catch(() => null)) as {
      isPriority?: unknown;
    } | null;
    if (typeof body?.isPriority !== "boolean") {
      return NextResponse.json(
        { error: "isPriority_required" },
        { status: 400 }
      );
    }
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("subcategories")
      .update({ is_priority: body.isPriority })
      .eq("id", id)
      .is("user_id", null);
    if (error) throw error;
    invalidatePrioritySubcategoryCache();
    return NextResponse.json({ ok: true, isPriority: body.isPriority });
  } catch (e) {
    return apiError("admin.subcategories.priority", e);
  }
}
