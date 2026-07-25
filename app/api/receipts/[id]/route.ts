import { NextRequest, NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { apiError } from "@/lib/api-error";
import { editReceipt, removeReceipt } from "@/lib/services/receipts";
import { getReceipt } from "@/lib/db/receipts";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const receipt = await getReceipt(session.user.id, id);
    if (!receipt) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ receipt });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:receipts/[id].GET", e);
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;

    const patch: Parameters<typeof editReceipt>[0]["patch"] = {};
    const s = (k: string) =>
      typeof body[k] === "string" ? (body[k] as string) : null;
    if ("receiptDate" in body && typeof body.receiptDate === "string") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.receiptDate)) {
        return NextResponse.json(
          { error: "invalid_receipt_date" },
          { status: 400 }
        );
      }
      patch.receiptDate = body.receiptDate;
    }
    if ("amount" in body && typeof body.amount === "number") {
      patch.amount = body.amount;
    }
    if ("supplier" in body) patch.supplier = s("supplier");
    if ("abn" in body) patch.abn = s("abn");
    if ("description" in body) patch.description = s("description");
    if ("category" in body) patch.category = s("category");
    if ("businessPurpose" in body) patch.businessPurpose = s("businessPurpose");
    if ("gstAmount" in body)
      patch.gstAmount =
        typeof body.gstAmount === "number" ? body.gstAmount : null;
    if ("gstClaimable" in body)
      patch.gstClaimable =
        typeof body.gstClaimable === "boolean" ? body.gstClaimable : null;
    if ("paymentMethod" in body) patch.paymentMethod = s("paymentMethod");
    if ("invoiceNumber" in body) patch.invoiceNumber = s("invoiceNumber");
    if ("isAsset" in body && typeof body.isAsset === "boolean")
      patch.isAsset = body.isAsset;
    if ("workRelatedPercent" in body)
      patch.workRelatedPercent =
        typeof body.workRelatedPercent === "number"
          ? body.workRelatedPercent
          : null;
    if ("notes" in body) patch.notes = s("notes");

    const receipt = await editReceipt({
      userId: session.user.id,
      id,
      patch,
    });
    return NextResponse.json({ receipt });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:receipts/[id].PATCH", e);
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    await removeReceipt(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return apiError("api:receipts/[id].DELETE", e);
  }
}
