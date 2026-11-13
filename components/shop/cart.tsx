"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";

// The shop cart — kept in the browser (no account needed). Prices here are
// only for display; checkout re-prices everything on the server.

export interface CartProduct {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  kind: "download" | "post" | "manual";
  image: string | null;
}

export interface CartItem extends CartProduct {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  count: number;
  totalCents: number;
  needsAddress: boolean;
  add: (p: CartProduct) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const KEY = "tal-shop-cart";
const CartContext = createContext<CartState | null>(null);

/** Downloads and emailed files are bought once; posted items can be several. */
export const multiple = (kind: CartProduct["kind"]) => kind === "post";

// The saved cart, shared across tabs (the storage event) and empty during
// server rendering.
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let cache: CartItem[] | null = null;

function readCart(): CartItem[] {
  if (cache) return cache;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(saved) ? saved : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function writeCart(items: CartItem[]) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, readCart, () => EMPTY);
  const [open, setOpen] = useState(false);
  const setItems = useCallback((update: (cur: CartItem[]) => CartItem[]) => writeCart(update(readCart())), []);

  const add = useCallback((p: CartProduct) => {
    setItems((cur) => {
      const found = cur.find((i) => i.id === p.id);
      if (!found) return [...cur, { ...p, quantity: 1 }];
      if (!multiple(p.kind)) return cur;
      return cur.map((i) => (i.id === p.id ? { ...i, ...p, quantity: Math.min(i.quantity + 1, 20) } : i));
    });
    setOpen(true);
  }, [setItems]);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setItems((cur) =>
      quantity < 1 ? cur.filter((i) => i.id !== id) : cur.map((i) => (i.id === id ? { ...i, quantity: Math.min(quantity, 20) } : i))
    );
  }, [setItems]);

  const remove = useCallback((id: string) => setItems((cur) => cur.filter((i) => i.id !== id)), [setItems]);
  const clear = useCallback(() => setItems(() => EMPTY), [setItems]);

  const value = useMemo<CartState>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      totalCents: items.reduce((n, i) => n + i.price_cents * i.quantity, 0),
      needsAddress: items.some((i) => i.kind === "post"),
      add,
      setQuantity,
      remove,
      clear,
      open,
      setOpen,
    }),
    [items, add, setQuantity, remove, clear, open]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}

export const formatPrice = (cents: number) =>
  cents === 0 ? "Free" : (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
