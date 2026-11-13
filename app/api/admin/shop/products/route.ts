import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { insertProduct } from "@/lib/shop/db";
import { ProductBody, productFields } from "./schema";

// POST — Admin → Shop: add a product.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "s") return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const parsed = ProductBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid product" }, { status: 400 });
  try {
    const product = await insertProduct(productFields(parsed.data));
    return NextResponse.json({ product });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return NextResponse.json({ message: "Another product already uses that web address." }, { status: 409 });
    }
    throw e;
  }
}
