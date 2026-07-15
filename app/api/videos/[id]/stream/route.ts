import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { getVideo } from "@/lib/db/videos";
import { createSignedVideoDownloadUrl } from "@/lib/supabase/videoStorage";
import { apiError } from "@/lib/api-error";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    await requireSession();
    const { id } = await ctx.params;
    const video = await getVideo(id);
    if (!video) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (video.source !== "upload" || !video.storage_path) {
      return NextResponse.json(
        { error: "not_streamable" },
        { status: 400 }
      );
    }
    const url = await createSignedVideoDownloadUrl(video.storage_path);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:videos[id].stream.GET", e);
  }
}
