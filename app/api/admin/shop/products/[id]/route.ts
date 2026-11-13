import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteProduct, updateProduct } from "@/lib/shop/db";
import { ProductBody, productFields } from "../schema";

type Ctx = { params: Promise<{ id: string }> };

async function isAdmin() {
  const session = await getSession();
  return session?.user.role === "s";
}

// PATCH — Admin → Shop: save a product.
export async function PATCH(request: NextRequest, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  const parsed = ProductBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid product" }, { status: 400 });
  try {
    const product = await updateProduct((await params).id, productFields(parsed.data));
    return NextResponse.json({ product });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return NextResponse.json({ message: "Another product already uses that web address." }, { status: 409 });
    }
    throw e;
  }
}

// DELETE — remove a product. Past orders keep their copy of its name and
// price; its download links stop working, so hiding it (untick "For sale")
// is usually better.
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  await deleteProduct((await params).id);
  return NextResponse.json({ ok: true });
}
