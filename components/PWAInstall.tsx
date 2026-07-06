"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isInAppBrowser(): boolean {
  const nav = navigator as Navigator & { vendor?: string };
  const ua = nav.userAgent || nav.vendor || "";
  return /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line|Twitter|MicroMessenger|TikTok|LinkedInApp/i.test(
    ua
  );
}

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    setIsStandalone(standalone);

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const android = /Android/.test(navigator.userAgent);
    setIsIOS(ios);
    setIsAndroid(android);

    const inApp = isInAppBrowser();
    setInAppBrowser(inApp);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (!dismissed) {
        setTimeout(() => setShowBanner(true), 2000);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (ios && !standalone) {
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (!dismissed) {
        setTimeout(() => setShowBanner(true), 3000);
      }
    }

    if (inApp && !standalone) {
      const dismissed = localStorage.getItem("pwa-inapp-dismissed");
      if (!dismissed) setShowBanner(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem(
      inAppBrowser ? "pwa-inapp-dismissed" : "pwa-install-dismissed",
      "true"
    );
  }

  function handleOpenInChrome() {
    const url = location.href.replace(/^https?:\/\//, "");
    location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`;
  }

  if (isStandalone || !showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-tal-plum-dark text-white rounded-2xl shadow-2xl p-4 z-50">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full"
        aria-label="Dismiss"
      >
        <span aria-hidden>✕</span>
      </button>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-tal-cream rounded-lg shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#23191b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">
            {inAppBrowser ? "Open in your browser" : "Install The Adulting Life"}
          </h3>
          {inAppBrowser ? (
            isIOS ? (
              <p className="text-xs text-white/70 mt-1">
                Tap <span aria-hidden>•••</span> at the bottom right, then
                &quot;Open in Safari&quot; to install.
              </p>
            ) : isAndroid ? (
              <p className="text-xs text-white/70 mt-1">
                Tap below to open in Chrome, then install from there.
              </p>
            ) : (
              <p className="text-xs text-white/70 mt-1">
                Open this page in your device&apos;s browser to install.
              </p>
            )
          ) : isIOS ? (
            <p className="text-xs text-white/70 mt-1">
              Tap Share <span aria-hidden>⤴</span> then &quot;Add to Home
              Screen&quot;.
            </p>
          ) : (
            <p className="text-xs text-white/70 mt-1">
              Get quick access from your home screen.
            </p>
          )}

          {inAppBrowser && isAndroid && (
            <button
              onClick={handleOpenInChrome}
              className="mt-3 w-full bg-tal-cream hover:bg-tal-cream-soft text-tal-plum-dark font-medium text-sm py-2 px-4 rounded-lg"
            >
              Open in Chrome
            </button>
          )}

          {!inAppBrowser && !isIOS && (
            <button
              onClick={handleInstall}
              className="mt-3 w-full bg-tal-cream hover:bg-tal-cream-soft text-tal-plum-dark font-medium text-sm py-2 px-4 rounded-lg"
            >
              Install app
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
