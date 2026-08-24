import { NextResponse } from "next/server";
import {
  getEffectiveAdmin,
  requireSession,
  UnauthorizedError,
} from "@/lib/auth/session";
import { loadHelpDoc, updateHelpDoc } from "@/lib/help/loader";
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

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const admin = await getEffectiveAdmin();
    if (!admin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { slug } = await ctx.params;
    const body = (await req.json().catch(() => null)) as {
      title?: unknown;
      bodyMarkdown?: unknown;
    } | null;
    const title = typeof body?.title === "string" ? body.title : "";
    const bodyMarkdown =
      typeof body?.bodyMarkdown === "string" ? body.bodyMarkdown : "";
    if (!title.trim() || !bodyMarkdown.trim()) {
      return NextResponse.json(
        { error: "title_and_body_required" },
        { status: 400 }
      );
    }
    const doc = await updateHelpDoc(slug, { title, bodyMarkdown });
    if (!doc) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(doc);
  } catch (e) {
    return apiError("api:help.PATCH", e);
  }
}
