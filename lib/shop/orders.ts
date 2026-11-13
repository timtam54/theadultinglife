import { randomBytes } from "node:crypto";
import { sendMail } from "@/lib/services/mailer";
import {
  claimOrderPaid,
  getOrder,
  getProductsByIds,
  gstOf,
  updateOrder,
  type NewOrderItem,
  type ShopOrderWithItems,
  type ShopProduct,
} from "./db";

// Order logic shared by checkout, the Stripe webhook and the thank-you page.

const ADMIN_INBOX = "hello@theadultinglife.com.au";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const MAX_QUANTITY = 20;

export const money = (cents: number) =>
  (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" });

export const token = () => randomBytes(24).toString("base64url");

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface PricedCart {
  lines: { product: ShopProduct; quantity: number }[];
  totalCents: number;
  needsAddress: boolean;
}

/** Prices a cart from the database — never trusts prices sent by the
 *  browser. Returns null if a product is missing or no longer for sale. */
export async function priceCart(cart: CartLine[]): Promise<PricedCart | null> {
  const merged = new Map<string, number>();
  for (const l of cart) merged.set(l.productId, (merged.get(l.productId) ?? 0) + l.quantity);
  const products = await getProductsByIds([...merged.keys()]);
  if (products.length !== merged.size || products.some((p) => !p.active)) return null;
  const lines = products.map((product) => ({
    product,
    // A download or emailed file is bought once, whatever the quantity.
    quantity: product.kind === "post" ? Math.min(merged.get(product.id)!, MAX_QUANTITY) : 1,
  }));
  return {
    lines,
    totalCents: lines.reduce((n, l) => n + l.product.price_cents * l.quantity, 0),
    needsAddress: lines.some((l) => l.product.kind === "post"),
  };
}

export function orderItemsFor(cart: PricedCart): NewOrderItem[] {
  return cart.lines.map(({ product, quantity }) => ({
    product_id: product.id,
    name: product.name,
    kind: product.kind,
    unit_price_cents: product.price_cents,
    quantity,
    download_token: product.kind !== "manual" && product.file_path ? token() : null,
  }));
}

export { gstOf };

export const orderPageUrl = (o: { id: string; access_key: string }) =>
  `${APP_URL}/shop/order/${o.id}?key=${o.access_key}`;

export const downloadUrl = (downloadToken: string) => `${APP_URL}/api/shop/download/${downloadToken}`;

/** Marks a pending order paid (once) and sends the receipt and the admin
 *  notification. Safe to call from both the webhook and the thank-you page. */
export async function completeOrder(orderId: string): Promise<void> {
  const claimed = await claimOrderPaid(orderId);
  if (!claimed) return;
  const order = await getOrder(orderId);
  if (!order) return;
  await sendReceipt(order).catch((e) => console.error("[shop] receipt send failed", order.order_number, e));
  await sendAdminNotice(order).catch((e) => console.error("[shop] admin notice failed", order.order_number, e));
}

function itemLines(order: ShopOrderWithItems) {
  return order.items
    .map((i) => `  ${i.quantity > 1 ? `${i.quantity} × ` : ""}${i.name} — ${money(i.unit_price_cents * i.quantity)}`)
    .join("\n");
}

function addressLines(order: ShopOrderWithItems) {
  return [
    order.name,
    order.ship_line1,
    order.ship_line2,
    [order.ship_suburb, order.ship_state, order.ship_postcode].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .map((l) => `  ${l}`)
    .join("\n");
}

async function sendReceipt(order: ShopOrderWithItems) {
  const downloads = order.items.filter((i) => i.download_token);
  const posted = order.items.some((i) => i.kind === "post");
  const emailed = order.items.filter((i) => i.kind === "manual");
  const free = order.total_cents === 0;

  const parts = [
    `Hi ${order.name.split(" ")[0]},`,
    free ? "Thanks for your order — here it is." : "Thank you for your order!",
    `Order #${order.order_number}\n${itemLines(order)}\n\n  Total: ${money(order.total_cents)}${
      free ? "" : ` (includes GST of ${money(order.gst_cents)})`
    }`,
  ];
  if (downloads.length > 0) {
    parts.push(
      `Your download${downloads.length > 1 ? "s" : ""}:\n` +
        downloads.map((i) => `  ${i.name}\n  ${downloadUrl(i.download_token!)}`).join("\n\n")
    );
  }
  if (emailed.length > 0) {
    parts.push(
      `${emailed.map((i) => i.name).join(", ")} will be emailed to you within 24 hours.`
    );
  }
  if (posted) parts.push(`We'll post your order to:\n${addressLines(order)}`);
  parts.push(`You can view your order any time here:\n${orderPageUrl(order)}`);
  parts.push("Questions? Just reply to this email.\n\n— The Adulting Life");

  await sendMail("shop-receipt", {
    to: order.email,
    subject: `Your order from The Adulting Life (#${order.order_number})`,
    text: parts.join("\n\n"),
    replyTo: ADMIN_INBOX,
  });
  await updateOrder(order.id, { receipt_sent_at: new Date().toISOString() });
}

async function sendAdminNotice(order: ShopOrderWithItems) {
  const posted = order.items.some((i) => i.kind === "post");
  const emailed = order.items.filter((i) => i.kind === "manual");
  const todo = [
    posted ? "Post the order" : null,
    emailed.length ? `Email ${emailed.map((i) => i.name).join(", ")} to the customer` : null,
  ].filter(Boolean);

  await sendMail("shop-admin-notice", {
    to: ADMIN_INBOX,
    subject: `New shop order #${order.order_number} — ${money(order.total_cents)}`,
    text: [
      `New order #${order.order_number} from ${order.name} (${order.email}${order.phone ? `, ${order.phone}` : ""}).`,
      itemLines(order),
      `Total: ${money(order.total_cents)}`,
      posted ? `Post to:\n${addressLines(order)}` : null,
      todo.length ? `To do:\n${todo.map((t) => `  • ${t}`).join("\n")}` : "Nothing to do — downloads are delivered automatically.",
      order.newsletter_opt_in ? "They'd like to join the newsletter." : null,
      `Orders: ${APP_URL}/admin/shop/orders`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    replyTo: order.email,
  });
}
