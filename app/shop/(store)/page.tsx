import { listProducts, toCartProduct } from "@/lib/shop/db";
import { ProductRow } from "@/components/shop/ProductBits";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await listProducts({ activeOnly: true });
  return (
    <>
      <h1 className="sr-only">Shop</h1>
      {products.length === 0 ? (
        <p className="text-center text-tal-plum-soft">The shop is being restocked — please check back soon.</p>
      ) : (
        <div className="divide-y divide-tal-line">
          {products.map((p) => (
            <ProductRow key={p.id} product={toCartProduct(p)} intro={p.summary} />
          ))}
        </div>
      )}
    </>
  );
}
