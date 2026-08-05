import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { findPotentialDuplicates } from "@/lib/db/receipts";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";

// Called from the confirm form as the user edits date / amount / supplier, so
// they can spot a duplicate before saving.
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as {
      receiptDate?: unknown;
      amount?: unknown;
      supplier?: unknown;
    };
    const receiptDate =
      typeof body.receiptDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.receiptDate)
        ? body.receiptDate
        : null;
    const amount =
      typeof body.amount === "number" && Number.isFinite(body.amount)
        ? body.amount
        : null;
    if (!receiptDate || amount === null || amount === 0) {
      return NextResponse.json({ duplicates: [] });
    }
    const supplier =
      typeof body.supplier === "string" && body.supplier.trim()
        ? body.supplier.trim()
        : null;
    const duplicates = await findPotentialDuplicates(session.user.id, {
      receiptDate,
      amount,
      supplier,
    });
    return NextResponse.json({ duplicates });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:receipts.check-duplicate.POST", e);
  }
}
