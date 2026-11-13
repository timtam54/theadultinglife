import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getProductByLegacySlug, getProductBySlug, toCartProduct } from "@/lib/shop/db";
import { ADD_TO_CART, AddOnArrival, AddToCartButton, Price } from "@/components/shop/ProductBits";
import { ProductDescription } from "@/components/shop/ProductDescription";

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
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <h1 className="font-display text-3xl font-light leading-tight text-tal-plum-dark lg:text-[2.6rem]">{product.name}</h1>
          <hr className="mb-6 mt-5 border-t-2 border-tal-plum-dark" />
          <div className="flex flex-col items-start">
            <AddToCartButton product={cartProduct} className={ADD_TO_CART} />
            <Price cents={product.price_cents} />
            <p className="mt-1 text-sm text-tal-plum-soft">{DELIVERY[product.kind]}</p>
          </div>
          {product.description && (
            <ProductDescription text={product.description} className="mt-8 space-y-4 text-[15px] leading-7 text-tal-plum-dark" />
          )}
        </div>
        <div className="lg:sticky lg:top-24">
          {cartProduct.image && <img src={cartProduct.image} alt={product.name} className="w-full" />}
        </div>
      </div>
      <AddOnArrival product={cartProduct} />
    </div>
  );
}
