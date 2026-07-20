import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AuditPath } from "@/components/AuditPath";
import { AppSidebar } from "@/components/AppSidebar";
import { UserMenu } from "@/components/UserMenu";
import { FamilySwitcher } from "@/components/FamilySwitcher";
import { CelebrationLayer } from "@/components/CelebrationLayer";
import { getActiveFamilyUser } from "@/lib/services/activeUser";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { activeUserId, users: familyUsers } = await getActiveFamilyUser(
    session.user.id,
    session.user.familyGroupId
  );
  const pickerUsers = familyUsers.map((u) => ({
    id: u.id,
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    member_kind: u.member_kind,
    is_primary: u.is_primary,
  }));

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

      <div className="flex-1 min-w-0 flex flex-col bg-tal-cream-soft">
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
            <FamilySwitcher users={pickerUsers} activeUserId={activeUserId} />
            <Link
              href="/tal-ai"
              className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-full bg-black text-white text-sm font-medium hover:bg-tal-plum-dark transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              Ask TAL AI
            </Link>
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

      <CelebrationLayer />
    </div>
  );
}
