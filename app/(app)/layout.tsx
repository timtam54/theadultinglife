import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AuditPath } from "@/components/AuditPath";
import { AppSidebar } from "@/components/AppSidebar";
import { UserMenu } from "@/components/UserMenu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex">
      <AuditPath />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-tal-plum focus:text-white focus:px-3 focus:py-2 focus:rounded-md"
      >
        Skip to main content
      </a>

      <AppSidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-tal-cream-soft border-b border-tal-line md:bg-transparent md:border-0">
          <div className="flex items-center justify-between px-4 md:px-6 h-16">
            <nav
              aria-label="Primary mobile"
              className="md:hidden flex items-center gap-4 text-sm"
            >
              <Link href="/dashboard">Home</Link>
              <Link href="/records">Admin</Link>
              <Link href="/templates">Templates</Link>
              <Link href="/learn">Learn</Link>
            </nav>
            <div className="flex-1 md:flex-none" />
            <UserMenu
              firstName={session.user.firstName ?? session.user.name}
              avatarUrl={session.user.avatarUrl}
              isSuper={session.user.role === "s"}
            />
          </div>
        </header>

        <main id="main" className="flex-1 w-full px-4 md:px-8 pt-2 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
