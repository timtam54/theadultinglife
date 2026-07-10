import { LifeAdminSidebar } from "@/components/LifeAdminSidebar";

export default function LifeAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] -my-8 min-h-[calc(100vh-4rem)] bg-white">
      <div className="flex min-h-[calc(100vh-4rem)]">
        <LifeAdminSidebar />
        <div className="flex-1 min-w-0 bg-white">
          <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
