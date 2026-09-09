"use client";

/*
 * Blocking dialog with step-by-step "how to enable your microphone"
 * instructions per platform. Auto-detects the user's browser + OS on mount
 * and pre-selects the matching tab, but the user can switch to any tab.
 */

import { useEffect, useState } from "react";

type Platform =
  | "safari-ios"
  | "chrome-android"
  | "safari-mac"
  | "chrome-desktop"
  | "edge-desktop"
  | "firefox-desktop"
  | "unknown";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMac = /Macintosh/.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edg\//.test(ua);
  const isEdge = /Edg\//.test(ua);
  const isFirefox = /Firefox/.test(ua);
  if (isIOS) return "safari-ios";
  if (isAndroid) return "chrome-android";
  if (isMac && isSafari) return "safari-mac";
  if (isEdge) return "edge-desktop";
  if (isFirefox) return "firefox-desktop";
  if (isChrome) return "chrome-desktop";
  return "unknown";
}

export function MicHelpDialog({ onClose }: { onClose: () => void }) {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [tab, setTab] = useState<Platform>("chrome-desktop");

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    setTab(p === "unknown" ? "chrome-desktop" : p);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tabs: { id: Platform; label: string }[] = [
    { id: "safari-ios", label: "iPhone / iPad" },
    { id: "chrome-android", label: "Android" },
    { id: "chrome-desktop", label: "Chrome" },
    { id: "safari-mac", label: "Safari (Mac)" },
    { id: "edge-desktop", label: "Edge" },
    { id: "firefox-desktop", label: "Firefox" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mic-help-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg max-h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <header className="px-5 py-4 border-b border-tal-line bg-tal-cream-soft flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="mic-help-title"
              className="font-display text-lg text-tal-plum leading-tight"
            >
              How to enable your microphone
            </h2>
            <p className="text-xs text-tal-plum-soft mt-0.5">
              Pick your device or browser for step-by-step instructions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full text-tal-plum-soft hover:bg-white hover:text-tal-plum flex items-center justify-center shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="px-4 pt-3 pb-2 border-b border-tal-line bg-white overflow-x-auto">
          <div role="tablist" className="inline-flex items-center gap-1 text-xs">
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
                    "h-8 px-3 rounded-full font-medium transition-all inline-flex items-center gap-1.5 whitespace-nowrap " +
                    (active
                      ? "bg-tal-plum text-white shadow-sm"
                      : "text-tal-plum-soft hover:bg-tal-cream-soft hover:text-tal-plum")
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
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Steps platform={tab} />
        </div>

        <footer className="px-5 py-3 border-t border-tal-line bg-white flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg bg-black text-white text-sm font-medium"
          >
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
}

function Steps({ platform }: { platform: Platform }) {
  switch (platform) {
    case "safari-ios":
      return (
        <Ol>
          <Step n={1}>
            Open the <b>Settings</b> app on your iPhone or iPad.
          </Step>
          <Step n={2}>
            Scroll down and tap <b>Safari</b>.
          </Step>
          <Step n={3}>
            Under <b>Settings for Websites</b>, tap <b>Microphone</b>.
          </Step>
          <Step n={4}>
            Find <b>theadultinglife.com.au</b> in the list and tap{" "}
            <b>Allow</b>.
          </Step>
          <Step n={5}>
            Come back to Safari and reload the page — you may see a fresh
            &ldquo;Allow&rdquo; prompt at the top of the screen. Tap{" "}
            <b>Allow</b>.
          </Step>
          <Note>
            If you don&apos;t see us in the list yet, just start recording
            once — iOS will ask &ldquo;Allow theadultinglife.com.au to access
            the microphone?&rdquo; and you tap <b>Allow</b>.
          </Note>
        </Ol>
      );
    case "chrome-android":
      return (
        <Ol>
          <Step n={1}>
            In Chrome, tap the <b>lock icon</b> to the left of the address
            bar.
          </Step>
          <Step n={2}>
            Tap <b>Permissions</b>.
          </Step>
          <Step n={3}>
            Tap <b>Microphone</b> and set it to <b>Allow</b>.
          </Step>
          <Step n={4}>
            Close the menu and reload the page.
          </Step>
          <Note>
            If the lock icon doesn&apos;t show Microphone, tap the three-dot
            menu (⋮) → <b>Site settings</b> → <b>Microphone</b> → <b>Allow</b>.
          </Note>
        </Ol>
      );
    case "safari-mac":
      return (
        <Ol>
          <Step n={1}>
            In Safari, click <b>Safari</b> in the top-left menu bar.
          </Step>
          <Step n={2}>
            Choose <b>Settings for This Website…</b>{" "}
            <span className="text-tal-plum-soft">
              (or <b>Settings</b> → <b>Websites</b> → <b>Microphone</b>).
            </span>
          </Step>
          <Step n={3}>
            Next to <b>Microphone</b>, choose <b>Allow</b>.
          </Step>
          <Step n={4}>
            Reload the page.
          </Step>
          <Note>
            If Safari doesn&apos;t list us yet, click the microphone icon
            when recording — Safari will ask &ldquo;Allow…?&rdquo; and you
            click <b>Allow</b>.
          </Note>
        </Ol>
      );
    case "chrome-desktop":
      return (
        <Ol>
          <Step n={1}>
            Click the small icon on the far left of the address bar (a{" "}
            <b>lock</b>, <b>sliders</b>, or <b>&ldquo;View site
            information&rdquo;</b> icon).
          </Step>
          <Step n={2}>
            Click <b>Site settings</b> in the dropdown.
          </Step>
          <Step n={3}>
            Find <b>Microphone</b> in the list and change it to <b>Allow</b>.
          </Step>
          <Step n={4}>
            Close the settings tab and reload our page.
          </Step>
          <Note>
            Or go straight to{" "}
            <code className="text-[11px] bg-tal-cream-soft px-1 rounded">
              chrome://settings/content/microphone
            </code>{" "}
            in a new tab and manage the &ldquo;Allowed to use your
            microphone&rdquo; list.
          </Note>
        </Ol>
      );
    case "edge-desktop":
      return (
        <Ol>
          <Step n={1}>
            Click the icon on the far left of the address bar (a <b>lock</b>{" "}
            or <b>sliders</b> icon).
          </Step>
          <Step n={2}>
            Click <b>Permissions for this site</b>.
          </Step>
          <Step n={3}>
            Set <b>Microphone</b> to <b>Allow</b>.
          </Step>
          <Step n={4}>Reload the page.</Step>
        </Ol>
      );
    case "firefox-desktop":
      return (
        <Ol>
          <Step n={1}>
            Click the <b>lock icon</b> on the far left of the address bar.
          </Step>
          <Step n={2}>
            Click the <b>&gt;</b> next to <b>Connection secure</b>, then{" "}
            <b>More Information</b>.
          </Step>
          <Step n={3}>
            Go to the <b>Permissions</b> tab, find <b>Use the Microphone</b>,
            and untick <b>Use Default</b>. Then choose <b>Allow</b>.
          </Step>
          <Step n={4}>Close the window and reload our page.</Step>
        </Ol>
      );
    default:
      return (
        <p className="text-sm text-tal-plum">
          Look near your browser&apos;s address bar for a lock or microphone
          icon, then find <b>Microphone</b> in the site settings and choose{" "}
          <b>Allow</b>. Reload the page and try again.
        </p>
      );
  }
}

function Ol({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-3 text-sm text-tal-plum">{children}</ol>;
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-tal-plum text-white text-[11px] font-bold">
        {n}
      </span>
      <span className="flex-1 leading-relaxed">{children}</span>
    </li>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <li className="mt-2 rounded-lg bg-tal-cream-soft/70 border border-tal-line px-3 py-2 text-xs text-tal-plum-soft leading-relaxed">
      <span className="font-medium text-tal-plum">Tip:</span> {children}
    </li>
  );
}
