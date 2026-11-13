import type { Metadata } from "next";
import { listProducts, toCartProduct } from "@/lib/shop/db";
import { ProductRow } from "@/components/shop/ProductBits";
import { EmbedResizer } from "@/components/shop/EmbedResizer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products", robots: { index: false, follow: true } };

// The shop's product rows for the WordPress website, shown in an iframe:
//   <iframe src="https://app.theadultinglife.com.au/shop/embed" ...>
// Always the current products. "Add to cart" opens the product in the full shop
// (top window) with it already in the cart. ?limit=3 shows only the first few.
export default async function ShopEmbed({ searchParams }: { searchParams: Promise<{ limit?: string }> }) {
  const limit = Number((await searchParams).limit) || undefined;
  const products = (await listProducts({ activeOnly: true })).slice(0, limit);
  return (
    <div className="bg-white px-4">
      <div className="divide-y divide-tal-line">
        {products.map((p) => (
          <ProductRow key={p.id} product={toCartProduct(p)} intro={p.summary} target="_top" />
        ))}
      </div>
      <EmbedResizer />
    </div>
  );
}
