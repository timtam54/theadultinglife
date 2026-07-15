import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteVideo, getVideo, updateVideo } from "@/lib/db/videos";
import { deleteVideoObject } from "@/lib/supabase/videoStorage";
import { apiError } from "@/lib/api-error";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "s") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      description?: string | null;
      sortOrder?: number;
    };

    const patch: {
      title?: string;
      description?: string | null;
      sortOrder?: number;
    } = {};
    if (typeof body.title === "string") {
      const t = body.title.trim();
      if (!t) {
        return NextResponse.json(
          { error: "title_required" },
          { status: 400 }
        );
      }
      patch.title = t;
    }
    if (body.description !== undefined) {
      patch.description = body.description?.trim() || null;
    }
    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      patch.sortOrder = Math.trunc(body.sortOrder);
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "no_fields" }, { status: 400 });
    }
    await updateVideo(id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError("api:videos[id].PATCH", e);
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "s") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const video = await getVideo(id);
    if (!video) return NextResponse.json({ ok: true });

    await deleteVideo(id);
    if (video.source === "upload" && video.storage_path) {
      try {
        await deleteVideoObject(video.storage_path);
      } catch (e) {
        // Best-effort — row is already gone. Log and continue.
        console.warn("videos[id].DELETE: storage cleanup failed", e);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError("api:videos[id].DELETE", e);
  }
}
