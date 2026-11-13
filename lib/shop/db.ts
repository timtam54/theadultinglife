import { createServiceClient } from "@/lib/supabase/server";

// The online shop (moved from WordPress / WooCommerce). See
// supabase/migrations/212_shop.sql.

export type ProductKind = "download" | "post" | "manual";
export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";

export interface ShopProduct {
  id: string;
  slug: string;
  legacy_slugs: string[];
  name: string;
  summary: string | null;
  description: string | null;
  price_cents: number;
  kind: ProductKind;
  image_path: string | null;
  file_path: string | null;
  file_name: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ShopOrder {
  id: string;
  order_number: number;
  access_key: string;
  status: OrderStatus;
  email: string;
  name: string;
  phone: string | null;
  ship_line1: string | null;
  ship_line2: string | null;
  ship_suburb: string | null;
  ship_state: string | null;
  ship_postcode: string | null;
  total_cents: number;
  gst_cents: number;
  stripe_payment_intent_id: string | null;
  newsletter_opt_in: boolean;
  receipt_sent_at: string | null;
  paid_at: string | null;
  fulfilled_at: string | null;
  created_at: string;
  /** "woocommerce" = a past order imported from the old website. */
  source: "shop" | "woocommerce";
  payment_method: string | null;
  notes: string | null;
}

export interface ShopOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  kind: ProductKind;
  unit_price_cents: number;
  quantity: number;
  download_token: string | null;
  download_count: number;
}

export type ShopOrderWithItems = ShopOrder & { items: ShopOrderItem[] };

export const SHOP_IMAGES_BUCKET = "shop-images";
export const SHOP_FILES_BUCKET = "shop-files";

export function productImageUrl(path: string | null): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${SHOP_IMAGES_BUCKET}/${path}`;
}

/** What the browser needs to show a product and put it in the cart. */
export function toCartProduct(p: ShopProduct) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price_cents: p.price_cents,
    kind: p.kind,
    image: productImageUrl(p.image_path),
  };
}

export function gstOf(totalCents: number): number {
  // Prices include GST: GST is one eleventh of the total.
  return Math.round(totalCents / 11);
}

// ── Products ────────────────────────────────────────────────────────────

export async function listProducts({ activeOnly }: { activeOnly: boolean }): Promise<ShopProduct[]> {
  const supabase = createServiceClient();
  let q = supabase.from("shop_products").select("*");
  if (activeOnly) q = q.eq("active", true);
  const { data, error } = await q.order("sort_order").order("created_at");
  if (error) throw error;
  return (data as ShopProduct[] | null) ?? [];
}

export async function getProductBySlug(slug: string): Promise<ShopProduct | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("shop_products").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data as ShopProduct | null) ?? null;
}

/** An old WordPress product address → the product it moved to. */
export async function getProductByLegacySlug(slug: string): Promise<ShopProduct | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shop_products")
    .select("*")
    .contains("legacy_slugs", [slug])
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ShopProduct | null) ?? null;
}

export async function getProduct(id: string): Promise<ShopProduct | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("shop_products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as ShopProduct | null) ?? null;
}

export async function getProductsByIds(ids: string[]): Promise<ShopProduct[]> {
  if (ids.length === 0) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("shop_products").select("*").in("id", ids);
  if (error) throw error;
  return (data as ShopProduct[] | null) ?? [];
}

export type ProductInput = Pick<
  ShopProduct,
  "slug" | "name" | "summary" | "description" | "price_cents" | "kind" | "active" | "sort_order"
> &
  Partial<Pick<ShopProduct, "image_path" | "file_path" | "file_name" | "legacy_slugs">>;

export async function insertProduct(input: ProductInput): Promise<ShopProduct> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("shop_products").insert(input).select("*").single();
  if (error) throw error;
  return data as ShopProduct;
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<ShopProduct> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shop_products")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as ShopProduct;
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("shop_products").delete().eq("id", id);
  if (error) throw error;
}

// ── Orders ──────────────────────────────────────────────────────────────

export type NewOrder = Pick<
  ShopOrder,
  | "access_key"
  | "status"
  | "email"
  | "name"
  | "phone"
  | "ship_line1"
  | "ship_line2"
  | "ship_suburb"
  | "ship_state"
  | "ship_postcode"
  | "total_cents"
  | "gst_cents"
  | "newsletter_opt_in"
  | "paid_at"
>;
export type NewOrderItem = Omit<ShopOrderItem, "id" | "order_id" | "download_count">;

export async function insertOrder(order: NewOrder, items: NewOrderItem[]): Promise<ShopOrder> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("shop_orders").insert(order).select("*").single();
  if (error) throw error;
  const row = data as ShopOrder;
  const { error: itemsError } = await supabase
    .from("shop_order_items")
    .insert(items.map((i) => ({ ...i, order_id: row.id })));
  if (itemsError) {
    await supabase.from("shop_orders").delete().eq("id", row.id);
    throw itemsError;
  }
  return row;
}

export async function getOrder(id: string): Promise<ShopOrderWithItems | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .select("*, items:shop_order_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ShopOrderWithItems | null) ?? null;
}

export async function getOrderByPaymentIntent(paymentIntentId: string): Promise<ShopOrderWithItems | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .select("*, items:shop_order_items(*)")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (error) throw error;
  return (data as ShopOrderWithItems | null) ?? null;
}

export async function listOrders(): Promise<ShopOrderWithItems[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .select("*, items:shop_order_items(*)")
    .neq("status", "pending")
    .eq("source", "shop")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data as ShopOrderWithItems[] | null) ?? [];
}

export const IMPORTED_PAGE_SIZE = 50;

/** Past orders imported from the old website, newest first, a page at a
 *  time; `search` matches a name, email or order number. */
export async function listImportedOrders(
  page: number,
  search?: string
): Promise<{ orders: ShopOrderWithItems[]; total: number }> {
  const supabase = createServiceClient();
  let q = supabase
    .from("shop_orders")
    .select("*, items:shop_order_items(*)", { count: "exact" })
    .eq("source", "woocommerce");
  const term = search?.trim().replace(/[,%()]/g, " ").trim();
  if (term) {
    q = /^\d+$/.test(term)
      ? q.eq("order_number", Number(term))
      : q.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
  }
  const from = page * IMPORTED_PAGE_SIZE;
  const { data, error, count } = await q
    .order("created_at", { ascending: false })
    .range(from, from + IMPORTED_PAGE_SIZE - 1);
  if (error) throw error;
  return { orders: (data as ShopOrderWithItems[] | null) ?? [], total: count ?? 0 };
}

export async function updateOrder(id: string, patch: Partial<ShopOrder>): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("shop_orders").update(patch).eq("id", id);
  if (error) throw error;
}

/** pending → paid, once. Returns false if it was already paid (so the
 *  receipt isn't sent twice when the webhook and the thank-you page race). */
export async function claimOrderPaid(id: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function getItemByDownloadToken(
  token: string
): Promise<(ShopOrderItem & { order: Pick<ShopOrder, "status"> }) | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shop_order_items")
    .select("*, order:shop_orders(status)")
    .eq("download_token", token)
    .maybeSingle();
  if (error) throw error;
  return (data as (ShopOrderItem & { order: Pick<ShopOrder, "status"> }) | null) ?? null;
}

export async function bumpDownloadCount(item: ShopOrderItem): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("shop_order_items")
    .update({ download_count: item.download_count + 1 })
    .eq("id", item.id);
}
