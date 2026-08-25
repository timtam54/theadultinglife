import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "The Adulting Life Organiser",
    template: "%s · The Adulting Life Organiser",
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
