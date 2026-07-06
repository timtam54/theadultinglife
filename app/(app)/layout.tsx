import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { BrandLogo } from "@/components/BrandLogo";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-tal-line">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-16">
          <Link href="/dashboard" className="flex items-center gap-3">
            <BrandLogo className="h-9 w-auto" />
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="hover:text-tal-plum">
              Dashboard
            </Link>
            <Link href="/records" className="hover:text-tal-plum">
              Life Admin
            </Link>
            <Link href="/files" className="hover:text-tal-plum">
              Documents
            </Link>
            <Link href="/learn" className="hover:text-tal-plum">
              Learn
            </Link>
          </nav>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-tal-plum-soft hover:text-tal-plum"
            >
              Sign out
            </button>
          </form>
        </div>
        <nav className="sm:hidden border-t border-tal-line">
          <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-12 text-sm">
            <Link href="/dashboard">Home</Link>
            <Link href="/records">Admin</Link>
            <Link href="/files">Docs</Link>
            <Link href="/learn">Learn</Link>
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
