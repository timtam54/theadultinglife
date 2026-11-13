import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getOrder, updateOrder } from "@/lib/shop/db";

// PATCH — Admin → Shop orders: mark an order sent (posted / emailed), or
// back to "to do".
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== "s") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const { fulfilled } = (await request.json().catch(() => ({}))) as { fulfilled?: boolean };
  const order = await getOrder((await params).id);
  if (!order || !["paid", "fulfilled"].includes(order.status)) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }
  await updateOrder(order.id, fulfilled
    ? { status: "fulfilled", fulfilled_at: new Date().toISOString() }
    : { status: "paid", fulfilled_at: null });
  return NextResponse.json({ ok: true });
}
