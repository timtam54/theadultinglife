import { NextRequest, NextResponse } from "next/server";
import { getEffectiveAdmin } from "@/lib/auth/session";
import { listSubcategoriesByIds } from "@/lib/db/subcategories";
import { listQuestionsBySubcategory } from "@/lib/db/questions";
import { apiError } from "@/lib/api-error";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "form"
  );
}

/**
 * Validate and normalise a "new form" request. Doesn't write anything on its
 * own — the editor page saves the actual rows. Returns the URL to redirect to.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getEffectiveAdmin();
    if (!admin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = (await request.json().catch(() => null)) as {
      subcategoryId?: string;
      pageGroup?: string;
    } | null;
    const subcategoryId = body?.subcategoryId?.trim();
    if (!subcategoryId) {
      return NextResponse.json(
        { error: "subcategoryId_required" },
        { status: 400 }
      );
    }
    const subs = await listSubcategoriesByIds([subcategoryId]);
    const sub = subs[0];
    if (!sub) {
      return NextResponse.json(
        { error: "subcategory_not_found" },
        { status: 404 }
      );
    }
    const existing = await listQuestionsBySubcategory(subcategoryId);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "form_already_exists", pageGroup: existing[0].page_group },
        { status: 409 }
      );
    }
    const pageGroup = slugify(body?.pageGroup || sub.name);
    return NextResponse.json({
      ok: true,
      subcategoryId,
      pageGroup,
      editorHref: `/admin/folder-forms/${encodeURIComponent(subcategoryId)}?group=${encodeURIComponent(pageGroup)}`,
    });
  } catch (e) {
    return apiError("api:admin.folder-forms.POST", e);
  }
}
