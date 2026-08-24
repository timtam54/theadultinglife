import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { loadHelpDoc } from "@/lib/help/loader";
import { apiError } from "@/lib/api-error";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    await requireSession();
    const { slug } = await ctx.params;
    const doc = await loadHelpDoc(slug);
    if (!doc) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(doc, {
      headers: { "cache-control": "private, max-age=300" },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:help.GET", e);
  }
}
