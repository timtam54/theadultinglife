"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Someone who tapped "Start now" on the shop's app subscription row signs up
// first; once they're through the app's first-time steps, this takes them on
// to the subscribe page (once — the cookie is cleared).
const COOKIE = "tal_after_setup";

export function AfterSetupRedirect({ ready }: { ready: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!ready) return;
    const wanted = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`))?.split("=")[1];
    if (wanted !== "subscription") return;
    document.cookie = `${COOKIE}=; path=/; max-age=0`;
    if (pathname !== "/subscription") router.replace("/subscription");
  }, [ready, pathname, router]);
  return null;
}
