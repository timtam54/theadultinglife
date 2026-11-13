import { listProducts, toCartProduct } from "@/lib/shop/db";
import { ProductCard } from "@/components/shop/ProductBits";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await listProducts({ activeOnly: true });
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl text-tal-plum lg:text-4xl">Shop</h1>
        <p className="mt-2 text-tal-plum-soft">Organisers, guides and planners to help you adult like a boss.</p>
      </div>
      {products.length === 0 ? (
        <p className="text-center text-tal-plum-soft">The shop is being restocked — please check back soon.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={toCartProduct(p)} summary={p.summary} />
          ))}
        </div>
      )}
    </>
  );
}
