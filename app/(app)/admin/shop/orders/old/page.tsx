import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { IMPORTED_PAGE_SIZE, listImportedOrders } from "@/lib/shop/db";

export const metadata: Metadata = { title: "Old website orders" };
export const dynamic = "force-dynamic";

const money = (cents: number) => (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
const date = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

// Past orders from the old WordPress / WooCommerce shop, for reference
// (imported with scripts/import-woocommerce-orders.ts). Read-only.
export default async function OldShopOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== "s") notFound();
  const { page: pageParam, q = "" } = await searchParams;
  const page = Math.max(0, Number(pageParam) || 0);
  const { orders, total } = await listImportedOrders(page, q);
  const pages = Math.max(1, Math.ceil(total / IMPORTED_PAGE_SIZE));
  const href = (p: number) => `/admin/shop/orders/old?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-tal-plum">Old website orders</h1>
          <p className="text-sm text-tal-plum-soft">Orders from the old WooCommerce shop, kept for your records.</p>
        </div>
        <Link href="/admin/shop/orders" className="inline-flex h-10 items-center rounded-xl border border-tal-line bg-white px-4 text-sm text-tal-plum">
          New shop orders
        </Link>
      </div>
      <form className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email or order number"
          className="h-10 flex-1 rounded-xl border border-tal-line bg-white px-3 text-sm text-tal-plum"
        />
        <button className="h-10 rounded-xl bg-black px-4 text-sm font-medium text-white">Search</button>
      </form>
      <p className="mb-3 text-xs text-tal-plum-soft">
        {total} order{total === 1 ? "" : "s"}
        {q && <> matching &ldquo;{q}&rdquo; · <Link href="/admin/shop/orders/old" className="underline">show all</Link></>}
      </p>
      {orders.length === 0 ? (
        <p className="text-sm text-tal-plum-soft">No orders found.</p>
      ) : (
        <ul className="divide-y divide-tal-line overflow-hidden rounded-2xl border border-tal-line bg-white">
          {orders.map((o) => (
            <li key={o.id} className="p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium text-tal-plum">
                  #{o.order_number} · {o.name} · {money(o.total_cents)}
                </p>
                <span className="text-xs text-tal-plum-soft">
                  {date(o.created_at)}
                  {o.status !== "fulfilled" && <span className="ml-2 rounded-full bg-tal-cream px-2 py-0.5 text-tal-plum">{o.status}</span>}
                </span>
              </div>
              <p className="text-xs text-tal-plum-soft">
                {o.email}
                {o.phone && ` · ${o.phone}`}
                {o.payment_method && ` · ${o.payment_method}`}
              </p>
              <ul className="mt-1 text-tal-plum">
                {o.items.map((i) => (
                  <li key={i.id}>
                    {i.quantity > 1 && `${i.quantity} × `}
                    {i.name} <span className="text-tal-plum-soft">— {money(i.unit_price_cents * i.quantity)}</span>
                  </li>
                ))}
              </ul>
              {o.ship_line1 && (
                <p className="mt-1 text-xs text-tal-plum-soft">
                  {[o.ship_line1, o.ship_line2, `${o.ship_suburb ?? ""} ${o.ship_state ?? ""} ${o.ship_postcode ?? ""}`.trim()]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {o.notes && <p className="mt-1 text-xs italic text-tal-plum-soft">{o.notes}</p>}
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 0 ? <Link href={href(page - 1)} className="underline">← Newer</Link> : <span />}
          <span className="text-tal-plum-soft">
            Page {page + 1} of {pages}
          </span>
          {page + 1 < pages ? <Link href={href(page + 1)} className="underline">Older →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
