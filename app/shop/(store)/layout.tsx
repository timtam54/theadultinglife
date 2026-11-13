import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { CartButton, CartDrawer } from "@/components/shop/CartDrawer";

const WEBSITE = "https://www.theadultinglife.com.au";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-tal-cream-soft">
      <header className="sticky top-0 z-40 border-b border-tal-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <a href={WEBSITE} aria-label="The Adulting Life website">
            <BrandLogo wordmark priority className="h-10 w-auto" />
          </a>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/shop" className="text-tal-plum hover:underline">
              Shop
            </Link>
            <a href={WEBSITE} className="hidden text-tal-plum hover:underline sm:inline">
              Website
            </a>
            <CartButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 lg:py-12">{children}</main>
      <footer className="border-t border-tal-line py-6 text-center text-xs text-tal-plum-soft">
        <a href={WEBSITE} className="hover:underline">
          theadultinglife.com.au
        </a>{" "}
        · Prices in AUD and include GST ·{" "}
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
      </footer>
      <CartDrawer />
    </div>
  );
}
