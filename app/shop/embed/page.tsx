import type { Metadata } from "next";
import Link from "next/link";
import { listProducts, toCartProduct } from "@/lib/shop/db";
import { ProductCard } from "@/components/shop/ProductBits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products", robots: { index: false, follow: true } };

// The product grid for the WordPress website, shown in an iframe:
//   <iframe src="https://app.theadultinglife.com.au/shop/embed" ...>
// Always the current products. "Buy now" opens the product in the full shop
// (top window) with it already in the cart. ?limit=3 shows only the first few.
export default async function ShopEmbed({ searchParams }: { searchParams: Promise<{ limit?: string }> }) {
  const limit = Number((await searchParams).limit) || undefined;
  const products = (await listProducts({ activeOnly: true })).slice(0, limit);
  return (
    <div className="bg-transparent p-2">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={toCartProduct(p)} summary={p.summary} target="_top" />
        ))}
      </div>
      <div className="mt-6 text-center">
        <Link href="/shop" target="_top" className="inline-flex h-11 items-center rounded-xl bg-black px-6 text-sm font-medium text-white">
          Visit the shop
        </Link>
      </div>
    </div>
  );
}
