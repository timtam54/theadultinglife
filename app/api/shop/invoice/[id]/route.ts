import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSession } from "@/lib/auth/session";
import { getOrder } from "@/lib/shop/db";
import { renderInvoicePdf } from "@/lib/shop/invoice-pdf";
import { attachmentDisposition } from "@/lib/content-disposition";

export const runtime = "nodejs";

// GET — an order's invoice PDF. The buyer opens it with the ?key= from their
// order link; the admin can open any paid order's.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const order = await getOrder(id);
  if (!order || !["paid", "fulfilled", "refunded"].includes(order.status)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const keyOk = key.length === order.access_key.length && timingSafeEqual(Buffer.from(key), Buffer.from(order.access_key));
  if (!keyOk && (await getSession())?.user.role !== "s") return new NextResponse("Not found", { status: 404 });

  const { bytes, filename } = await renderInvoicePdf(order);
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "content-type": "application/pdf", "content-disposition": attachmentDisposition(filename).replace(/^attachment/, "inline") },
  });
}
