import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { actionPageSums } from "@/lib/db/audits";
import { apiError } from "@/lib/api-error";

function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "s") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const from = request.nextUrl.searchParams.get("from");
    if (!isIsoDate(from)) {
      return NextResponse.json({ error: "invalid_from" }, { status: 400 });
    }
    const rows = await actionPageSums(from);
    return NextResponse.json({ rows });
  } catch (e) {
    return apiError("api:admin.analytics.GET", e);
  }
}
