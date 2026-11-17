import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { createUserFolder } from "@/lib/services/subcategories";
import { apiError } from "@/lib/api-error";
import { requireWriteAccess } from "@/lib/subscription/access";

export async function POST(request: NextRequest) {
  const blocked = await requireWriteAccess();
  if (blocked) return blocked;
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      categoryId?: unknown;
      name?: unknown;
    };
    const row = await createUserFolder({
      userId: session.user.id,
      categoryId: body.categoryId,
      name: body.name,
    });
    return NextResponse.json({ folder: row }, { status: 201 });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const msg = e instanceof Error ? e.message : "server_error";
    const status = msg.includes("required") || msg.includes("Invalid") ? 400 : 500;
    return apiError("api:records.folders.POST", e, {
      status,
      code: status === 400 ? "bad_request" : "server_error",
    });
  }
}
