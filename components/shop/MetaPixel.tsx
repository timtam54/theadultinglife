"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

// Donna's Meta (Facebook / Instagram) pixel on the shop pages, so ads can see
// product views, add-to-carts and purchases. Set NEXT_PUBLIC_META_PIXEL_ID.

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

type Fbq = (...args: unknown[]) => void;
declare global {
  interface Window {
    fbq?: Fbq;
  }
}

/** Sends a standard event (no-op until the pixel has loaded or if unset). */
export function track(event: string, data?: Record<string, unknown>) {
  if (PIXEL_ID && typeof window !== "undefined") window.fbq?.("track", event, data);
}

export function MetaPixel() {
  const pathname = usePathname();
  useEffect(() => {
    track("PageView");
  }, [pathname]);
  if (!PIXEL_ID) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
    </Script>
  );
}

/** Fires one event when the page shows it. `once` (e.g. an order id) stops a
 *  refresh sending it twice. */
export function PixelEvent({ event, data, once }: { event: string; data?: Record<string, unknown>; once?: string }) {
  const payload = JSON.stringify(data ?? {});
  useEffect(() => {
    if (once) {
      const key = `tal-pixel-${event}-${once}`;
      try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, "1");
      } catch {}
    }
    // The pixel script may still be loading; give it a moment.
    const send = () => track(event, JSON.parse(payload));
    if (window.fbq) send();
    else setTimeout(send, 1500);
  }, [event, payload, once]);
  return null;
}
