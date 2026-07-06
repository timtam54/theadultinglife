import type { Metadata, Viewport } from "next";
import { Poppins, Source_Sans_3 } from "next/font/google";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Adulting Life",
  description:
    "The Adulting Life — organise your life admin, documents, and learn as you go.",
  applicationName: "The Adulting Life",
  appleWebApp: {
    capable: true,
    title: "The Adulting Life",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/Logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#4c373c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-tal-cream-soft text-tal-plum-dark">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
