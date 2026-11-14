"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { formatPrice, multiple, useCart } from "./cart";

// Header links share one look; only the page you're on is highlighted (a
// cream pill, bold). The cart is a plain link with a count badge — never
// filled, so it can't be mistaken for the current page.
const NAV = "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm text-tal-plum-dark hover:bg-tal-cream-soft";
const NAV_HERE = "bg-tal-cream font-semibold hover:bg-tal-cream";

export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={count > 0 ? `Open cart, ${count} item${count === 1 ? "" : "s"}` : "Open cart, empty"}
      className={"no-hover-fx " + NAV}
    >
      <span className="relative">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M6 7h12l-1 13H7L6 7Z" strokeLinejoin="round" />
          <path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-2 -top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#4c373c] px-1 text-[11px] font-semibold text-white">
            {count}
          </span>
        )}
      </span>
      Cart
    </button>
  );
}

/** "Shop" in the header: highlighted as the current page on the shop list,
 *  and scrolls back to the top when clicked there. */
export function ShopNavLink() {
  const pathname = usePathname();
  const here = pathname === "/shop";
  return (
    <Link
      href="/shop"
      aria-current={here ? "page" : undefined}
      onClick={(e) => {
        if (!here) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className={NAV + (here ? " " + NAV_HERE : "")}
    >
      Shop
    </Link>
  );
}

export const NAV_LINK = NAV;

export function CartDrawer() {
  const { items, open, setOpen, setQuantity, remove, totalCents } = useCart();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100000]" role="dialog" aria-modal="true" aria-label="Your cart">
      <button type="button" aria-label="Close cart" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between bg-black px-5 py-4 text-white">
          <h2 className="font-display text-lg">Your cart</h2>
          <button type="button" onClick={() => setOpen(false)} className="no-hover-fx text-sm text-white/80 hover:text-white">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <p className="text-sm text-tal-plum-soft">Your cart is empty.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((i) => (
                <li key={i.id} className="flex gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-tal-cream-soft">
                    {i.image && <img src={i.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-tal-plum">{i.name}</p>
                    <p className="text-sm text-tal-plum-soft">{formatPrice(i.price_cents * i.quantity)}</p>
                    <div className="mt-1 flex items-center gap-3 text-sm">
                      {multiple(i.kind) && (
                        <span className="inline-flex items-center rounded-lg border border-tal-line">
                          <button type="button" aria-label="One fewer" onClick={() => setQuantity(i.id, i.quantity - 1)} className="no-hover-fx h-7 w-7">
                            −
                          </button>
                          <span className="w-6 text-center">{i.quantity}</span>
                          <button type="button" aria-label="One more" onClick={() => setQuantity(i.id, i.quantity + 1)} className="no-hover-fx h-7 w-7">
                            +
                          </button>
                        </span>
                      )}
                      <button type="button" onClick={() => remove(i.id)} className="no-hover-fx text-tal-plum-soft underline hover:text-tal-plum">
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {items.length > 0 && (
          <div className="border-t border-tal-line p-5">
            <div className="mb-3 flex justify-between text-base text-tal-plum">
              <span>Total</span>
              <strong>{formatPrice(totalCents)}</strong>
            </div>
            <p className="mb-3 text-xs text-tal-plum-soft">Prices include GST. Postage is included.</p>
            <Link
              href="/shop/checkout"
              onClick={() => setOpen(false)}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-black text-sm font-medium text-white"
            >
              Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
