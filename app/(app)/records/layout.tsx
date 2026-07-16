import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Life Admin",
    template: "%s · Life Admin · The Adulting Life",
  },
  description:
    "Store your licences, Medicare, vehicle rego and other structured records — with expiry reminders.",
};

export default function LifeAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
