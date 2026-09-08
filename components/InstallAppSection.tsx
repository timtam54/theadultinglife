"use client";

import { useEffect, useState } from "react";
import { InstallInstructions } from "./InstallInstructions";

type Platform = "ios" | "android" | "desktop" | "unknown";

export function InstallAppSection() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [isStandalone, setIsStandalone] = useState(false);
  const [tab, setTab] = useState<Platform>("ios");

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    const android = /Android/.test(ua);
    const p: Platform = ios ? "ios" : android ? "android" : "desktop";
    setPlatform(p);
    setTab(p);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    setIsStandalone(standalone);
  }, []);

  if (isStandalone) {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900 text-sm p-3 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 12l5 5 9-11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        The app is already installed on this device.
      </div>
    );
  }

  const tabs: { id: Platform; label: string }[] = [
    { id: "ios", label: "iPhone / iPad" },
    { id: "android", label: "Android" },
    { id: "desktop", label: "Desktop" },
  ];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Choose your device"
        className="inline-flex items-center gap-1 rounded-full border border-tal-line bg-tal-cream-soft p-1 text-xs mb-4"
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          const suggested = platform === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={
                "h-8 px-3 rounded-full font-medium transition-all inline-flex items-center gap-1.5 " +
                (active
                  ? "bg-tal-plum text-white shadow-sm scale-105"
                  : "text-tal-plum-soft hover:bg-white hover:text-tal-plum")
              }
            >
              {t.label}
              {suggested && !active && (
                <span
                  aria-hidden
                  className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"
                  title="Detected device"
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="rounded-xl bg-tal-cream-soft/60 border border-tal-line p-4">
        <InstallInstructions platform={tab} variant="expanded" />
      </div>
    </div>
  );
}
