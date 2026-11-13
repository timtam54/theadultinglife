import type { Metadata } from "next";
import { CartProvider } from "@/components/shop/cart";
import { AuditPathPublic } from "@/components/AuditPathPublic";

// The public online shop — no account needed. Products are managed in
// Admin → Shop. The (store) group has the shop header; /shop/embed is the
// bare product grid the WordPress website shows in an iframe.

export const metadata: Metadata = {
  title: { default: "Shop", template: "%s · The Adulting Life Shop" },
  description: "Organisers, guides and planners to help you adult like a boss.",
  robots: { index: true, follow: true },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  // Shop visits (anonymous, by IP) show in Admin → Audit and Analytics.
  return (
    <CartProvider>
      {children}
      <AuditPathPublic />
    </CartProvider>
  );
}
