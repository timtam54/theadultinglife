import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAllAudits, logAudit } from "@/lib/services/audits";
import { apiError } from "@/lib/api-error";

function clientIp(request: NextRequest): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    null
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      page?: string;
      action?: string;
    };
    if (!body.page) {
      return NextResponse.json({ error: "page_required" }, { status: 400 });
    }
    const session = await getSession();
    const ip = clientIp(request);
    const ua = request.headers.get("user-agent");

    await logAudit({
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
      usernameFallback: ip ?? "anonymous",
      page: body.page,
      action: body.action ?? "unknown",
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError("api:audit.POST", e);
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "s") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const audits = await getAllAudits(2000);
    return NextResponse.json({ audits });
  } catch (e) {
    return apiError("api:audit.GET", e);
  }
}
