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

/** The first row of the shop: The Adulting Life app itself. A subscription
 *  belongs to an app account, so "Start now" signs them up (or in) and takes
 *  them to the subscribe page rather than adding to the cart. */
export function AppSubscriptionRow({ target }: { target?: "_top" }) {
  return (
    <section className="grid items-start gap-8 py-10 lg:grid-cols-2 lg:gap-12 lg:py-14">
      <div>
        <h2 className="font-display text-3xl font-light leading-tight text-tal-plum-dark lg:text-[2.6rem]">The Adulting Life App</h2>
        <hr className="mb-6 mt-5 border-t-2 border-tal-plum-dark" />
        <ProductDescription
          className="space-y-4 text-[15px] leading-7 text-tal-plum-dark"
          text={`**Organise your life. Reduce the stress.**

Everything in The Adulting Life Organiser, on your phone and computer — and so much more.

- Store all your important information in one secure place
- Learn practical life skills with step-by-step guidance
- Stay on top of renewals, reminders and important dates
- Your data is private, secure and always in your control

Got a promo code? You can enter it when you subscribe.`}
        />
        <div className="mt-8 flex flex-col items-start">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a server route (sets a cookie, then redirects), so a full page load */}
          <a href="/shop/start" target={target} className={ADD_TO_CART}>
            Start now
          </a>
          <p className="mt-2 text-sm text-tal-plum-dark">
            <strong className="text-base">$12.99</strong> a month or <strong className="text-base">$129.99</strong> a year
            <span className="ml-1 text-xs">Inc GST · cancel anytime</span>
          </p>
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a server route (sets a cookie, then redirects), so a full page load */}
      <a href="/shop/start" target={target} className="block">
        <img src="/loginhero.png" alt="Organising life admin together with The Adulting Life app" className="w-full" />
      </a>
    </section>
  );
}
