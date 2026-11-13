import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { bumpDownloadCount, getItemByDownloadToken, getProduct, SHOP_FILES_BUCKET } from "@/lib/shop/db";

export const runtime = "nodejs";

// GET — a buyer's personal download link (from the receipt email and the
// order page). Only works once the order is paid; hands over a signed link
// to the private file that expires in a minute, so the file itself never has
// a public address.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const item = await getItemByDownloadToken(token);
  if (!item || !["paid", "fulfilled"].includes(item.order.status) || !item.product_id) {
    return new NextResponse("This download link isn't valid.", { status: 404 });
  }
  const product = await getProduct(item.product_id);
  if (!product?.file_path) {
    return new NextResponse("This file isn't available right now — please reply to your receipt email.", {
      status: 404,
    });
  }
  const { data, error } = await createServiceClient()
    .storage.from(SHOP_FILES_BUCKET)
    .createSignedUrl(product.file_path, 60, { download: product.file_name ?? true });
  if (error || !data) {
    console.error("[shop/download] signed url failed", error);
    return new NextResponse("Couldn't start the download. Please try again.", { status: 500 });
  }
  await bumpDownloadCount(item);
  return NextResponse.redirect(data.signedUrl);
}
