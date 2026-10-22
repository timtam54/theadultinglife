import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset your PIN",
  description: "Choose a new app PIN for The Adulting Life.",
  robots: { index: false, follow: false },
};

export default function ResetPinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
