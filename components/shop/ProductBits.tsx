"use client";

import Link from "next/link";
import { useEffect } from "react";
import { formatPrice, useCart, type CartProduct } from "./cart";

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

export function ProductCard({ product, summary, target }: { product: CartProduct; summary: string | null; target?: "_top" }) {
  const href = `/shop/${product.slug}`;
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-tal-line bg-white">
      <Link href={href} target={target} className="block aspect-square bg-tal-cream-soft">
        {product.image && <img src={product.image} alt={product.name} className="h-full w-full object-cover" />}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={href} target={target} className="font-medium text-tal-plum hover:underline">
          {product.name}
        </Link>
        {summary && <p className="mt-1 line-clamp-3 text-sm text-tal-plum-soft">{summary}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="text-base font-semibold text-tal-plum">{formatPrice(product.price_cents)}</span>
          {target ? (
            <a
              href={`${href}?add=1`}
              target="_top"
              className="inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm font-medium text-white"
            >
              {product.price_cents === 0 ? "Get it free" : "Buy now"}
            </a>
          ) : (
            <AddToCartButton product={product} className="inline-flex h-10 items-center rounded-xl bg-black px-4 text-sm font-medium text-white" />
          )}
        </div>
      </div>
    </div>
  );
}
