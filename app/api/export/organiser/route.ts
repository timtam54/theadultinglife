import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { buildOrganiserExport } from "@/lib/services/export";
import { apiError } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await requireSession();
    const data = await buildOrganiserExport(session.user.familyGroupId);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="adulting-life-export-${date}.json"`,
      },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:export.organiser.GET", e);
  }
}
