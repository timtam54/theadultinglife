import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getProductByLegacySlug, getProductBySlug, toCartProduct } from "@/lib/shop/db";
import { AddOnArrival, AddToCartButton } from "@/components/shop/ProductBits";
import { ProductDescription } from "@/components/shop/ProductDescription";
import { formatPrice } from "@/components/shop/cart";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const DELIVERY: Record<string, string> = {
  download: "Instant download after purchase.",
  post: "Posted to you — postage included.",
  manual: "Emailed to you within 24 hours.",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  return product ? { title: product.name, description: product.summary ?? undefined } : {};
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    // An old WordPress product address (/product/<slug>/ redirects here).
    const moved = await getProductByLegacySlug(slug);
    permanentRedirect(moved?.active ? `/shop/${moved.slug}` : "/shop");
  }
  if (!product.active) notFound();
  const cartProduct = toCartProduct(product);

  return (
    <div>
      <Link href="/shop" className="text-sm text-tal-plum-soft hover:underline">
        ← All products
      </Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl bg-white">
          {cartProduct.image && <img src={cartProduct.image} alt={product.name} className="w-full object-cover" />}
        </div>
        <div>
          <h1 className="font-display text-3xl text-tal-plum">{product.name}</h1>
          <p className="mt-3 text-2xl font-semibold text-tal-plum">
            {formatPrice(product.price_cents)}
            {product.price_cents > 0 && <span className="ml-1 text-sm font-normal text-tal-plum-soft">inc GST</span>}
          </p>
          <p className="mt-1 text-sm text-tal-plum-soft">{DELIVERY[product.kind]}</p>
          <div className="mt-5">
            <AddToCartButton product={cartProduct} />
          </div>
          {product.description && (
            <div className="mt-8">
              <ProductDescription text={product.description} />
            </div>
          )}
        </div>
      </div>
      <AddOnArrival product={cartProduct} />
    </div>
  );
}
