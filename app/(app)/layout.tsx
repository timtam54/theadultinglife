import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { BrandLogo } from "@/components/BrandLogo";
import { AuditPath } from "@/components/AuditPath";
import { SuperMenu } from "@/components/SuperMenu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <AuditPath />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-tal-plum focus:text-white focus:px-3 focus:py-2 focus:rounded-md"
      >
        Skip to main content
      </a>
      <header className="bg-tal-cream-soft border-b border-tal-line">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-16">
          <Link href="/dashboard" className="flex items-center gap-3">
            <BrandLogo className="h-9 w-auto" />
          </Link>
          <nav aria-label="Primary" className="hidden sm:flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="hover:text-tal-plum">
              Dashboard
            </Link>
            <Link href="/records" className="hover:text-tal-plum">
              Life Admin
            </Link>
            <Link href="/templates" className="hover:text-tal-plum">
              Templates
            </Link>
            <Link href="/learn" className="hover:text-tal-plum">
              Learn
            </Link>
            {session.user.role === "s" && <SuperMenu />}
          </nav>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="no-hover-fx text-sm text-tal-plum-soft hover:text-tal-plum"
            >
              Sign out
            </button>
          </form>
        </div>
        <nav aria-label="Primary mobile" className="sm:hidden border-t border-tal-line">
          <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-12 text-sm">
            <Link href="/dashboard">Home</Link>
            <Link href="/records">Admin</Link>
            <Link href="/templates">Templates</Link>
            <Link href="/learn">Learn</Link>
            {session.user.role === "s" && (
              <>
                <Link href="/admin/users">Users</Link>
                <Link href="/admin/audit">Audit</Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main id="main" className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
