import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listOrders } from "@/lib/shop/db";
import { ShopOrdersAdmin } from "./ShopOrdersAdmin";

export const metadata: Metadata = { title: "Shop orders" };
export const dynamic = "force-dynamic";

export default async function AdminShopOrdersPage() {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();
  const orders = await listOrders();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-tal-plum">Shop orders</h1>
          <p className="text-sm text-tal-plum-soft">
            Paid orders. Downloads are delivered automatically — orders to post or email show under &ldquo;To send&rdquo;.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/shop/orders/old" className="inline-flex h-10 items-center rounded-xl border border-tal-line bg-white px-4 text-sm text-tal-plum">
            Old website orders
          </Link>
          <Link href="/admin/shop" className="inline-flex h-10 items-center rounded-xl border border-tal-line bg-white px-4 text-sm text-tal-plum">
            Products
          </Link>
        </div>
      </div>
      <ShopOrdersAdmin initial={orders} />
    </div>
  );
}
