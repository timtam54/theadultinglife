import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set your password",
  description: "Choose a password for your account.",
  robots: { index: false, follow: false },
};

export default function SetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
