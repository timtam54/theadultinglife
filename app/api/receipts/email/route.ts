import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";
import { emailReceiptsToAccountant } from "@/lib/services/receipts";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as {
      receiptIds?: unknown;
      toEmail?: unknown;
      message?: unknown;
    };

    const ids = Array.isArray(body.receiptIds)
      ? body.receiptIds.filter((v): v is string => typeof v === "string")
      : [];
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "no_receipts_selected" },
        { status: 400 }
      );
    }
    const toEmail =
      typeof body.toEmail === "string" ? body.toEmail.trim() : "";
    if (!EMAIL_RE.test(toEmail)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }
    const message =
      typeof body.message === "string" ? body.message.slice(0, 2000) : undefined;

    const fromName =
      session.user.name ??
      ([session.user.firstName, session.user.lastName]
        .filter(Boolean)
        .join(" ") ||
        "an Adulting Life user");

    const result = await emailReceiptsToAccountant({
      userId: session.user.id,
      receiptIds: ids,
      toEmail,
      fromName,
      fromEmail: session.user.email,
      message,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:receipts/email.POST", e);
  }
}
