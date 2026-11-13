"use client";

import Link from "next/link";
import { useEffect } from "react";
import { formatPrice, useCart, type CartProduct } from "./cart";
import { ProductDescription } from "./ProductDescription";

export function AddToCartButton({ product, className }: { product: CartProduct; className?: string }) {
  const { add } = useCart();
  return (
    <button
      type="button"
      onClick={() => add(product)}
      className={
        className ?? "inline-flex h-11 items-center justify-center rounded-xl bg-black px-6 text-sm font-medium text-white"
      }
    >
      {product.price_cents === 0 ? "Get it free" : "Add to cart"}
    </button>
  );
}

/** Opening a product with ?add=1 (from the website's "Buy now" buttons)
 *  puts it straight in the cart. */
export function AddOnArrival({ product }: { product: CartProduct }) {
  const { add } = useCart();
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("add") !== "1") return;
    add(product);
    url.searchParams.delete("add");
    window.history.replaceState(null, "", url.toString());
  }, [add, product]);
  return null;
}

// The website's colours: green "More details", dark "Add to cart".
const pill = "inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-bold uppercase tracking-wide text-white";
export const MORE_DETAILS = `${pill} bg-[#5dc79a] hover:bg-[#4fb98c]`;
export const ADD_TO_CART = `${pill} bg-[#4c373c] hover:bg-[#3a2a2e]`;

/** One product, laid out like the old website's shop: title, text, buttons
 *  and price on the left, the photo on the right. `target="_top"` is for
 *  the website's iframe, where the buttons open the full shop. */
export function ProductRow({
  product,
  intro,
  target,
}: {
  product: CartProduct;
  intro: string | null;
  target?: "_top";
}) {
  const href = `/shop/${product.slug}`;
  return (
    <section className="grid items-start gap-8 py-10 lg:grid-cols-2 lg:gap-12 lg:py-14">
      <div>
        <h2 className="font-display text-3xl font-light leading-tight text-tal-plum-dark lg:text-[2.6rem]">{product.name}</h2>
        <hr className="mb-6 mt-5 border-t-2 border-tal-plum-dark" />
        {intro && <ProductDescription text={intro} className="space-y-4 text-[15px] leading-7 text-tal-plum-dark" />}
        <div className="mt-8 flex flex-wrap items-start gap-4">
          <Link href={href} target={target} className={MORE_DETAILS}>
            More details
          </Link>
          <div className="flex flex-col items-center">
            {target ? (
              <a href={`${href}?add=1`} target="_top" className={ADD_TO_CART}>
                {product.price_cents === 0 ? "Get it free" : "Add to cart"}
              </a>
            ) : (
              <AddToCartButton product={product} className={ADD_TO_CART} />
            )}
            <Price cents={product.price_cents} />
          </div>
        </div>
      </div>
      <Link href={href} target={target} className="block">
        {product.image && <img src={product.image} alt={product.name} className="w-full" />}
      </Link>
    </section>
  );
}

export function Price({ cents }: { cents: number }) {
  return (
    <p className="mt-2 text-sm text-tal-plum-dark">
      <strong className="text-base">{formatPrice(cents)}</strong>
      {cents > 0 && <span className="ml-1 text-xs">Inc GST</span>}
    </p>
  );
}
