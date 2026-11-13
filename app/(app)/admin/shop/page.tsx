import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listProducts, productImageUrl } from "@/lib/shop/db";
import { ShopProductsAdmin } from "./ShopProductsAdmin";

export const metadata: Metadata = { title: "Shop" };
export const dynamic = "force-dynamic";

export default async function AdminShopPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();
  const products = await listProducts({ activeOnly: false });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-tal-plum">Shop products</h1>
          <p className="text-sm text-tal-plum-soft">
            What&rsquo;s for sale at{" "}
            <a href="/shop" target="_blank" className="underline">
              app.theadultinglife.com.au/shop
            </a>
            . Price a product at $0 to make it a free resource.
          </p>
        </div>
        <Link href="/admin/shop/orders" className="inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm font-medium text-white">
          Orders
        </Link>
      </div>
      <ShopProductsAdmin initial={products.map((p) => ({ ...p, image_url: productImageUrl(p.image_path) }))} />
    </div>
  );
}
