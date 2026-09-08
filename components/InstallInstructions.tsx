"use client";

/*
 * Platform-specific "how to install this PWA" instructions.
 *
 * Uses inline SVG icons that mimic each browser's real UI (Safari Share icon,
 * Chrome kebab menu, etc.) so users can pattern-match against what they're
 * actually looking at. Kept in one component so both the install popup and
 * the Settings page render identical steps.
 */

interface Props {
  platform: "ios" | "android" | "desktop" | "unknown";
  variant?: "compact" | "expanded";
}

export function InstallInstructions({ platform, variant = "expanded" }: Props) {
  const isCompact = variant === "compact";
  const wrap = isCompact
    ? "space-y-2 text-xs text-white/85"
    : "space-y-3 text-sm text-tal-plum";
  const stepClass = isCompact
    ? "flex items-start gap-2.5"
    : "flex items-start gap-3";
  const numClass = isCompact
    ? "shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/15 text-[10px] font-bold text-white"
    : "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-tal-plum text-white text-[11px] font-bold";
  const iconWrap = isCompact
    ? "inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/15 shrink-0 ml-1"
    : "inline-flex items-center justify-center w-7 h-7 rounded-md bg-tal-cream text-tal-plum shrink-0 ml-1";

  if (platform === "ios") {
    return (
      <ol className={wrap}>
        <li className={stepClass}>
          <span className={numClass}>1</span>
          <span className="flex-1 flex items-center flex-wrap gap-1">
            Tap the <b>Share</b> icon at the bottom of Safari:
            <span className={iconWrap} aria-hidden>
              <IosShareIcon />
            </span>
          </span>
        </li>
        <li className={stepClass}>
          <span className={numClass}>2</span>
          <span className="flex-1">
            Scroll down in the share menu.
          </span>
        </li>
        <li className={stepClass}>
          <span className={numClass}>3</span>
          <span className="flex-1 flex items-center flex-wrap gap-1">
            Tap <b>&ldquo;Add to Home Screen&rdquo;</b>
            <span className={iconWrap} aria-hidden>
              <PlusSquareIcon />
            </span>
          </span>
        </li>
        <li className={stepClass}>
          <span className={numClass}>4</span>
          <span className="flex-1">
            Tap <b>Add</b> in the top-right corner.
          </span>
        </li>
        <li className={stepClass}>
          <span className={numClass}>5</span>
          <span className="flex-1">
            Find <b>The Adulting Life</b> icon on your home screen and open it
            from there.
          </span>
        </li>
      </ol>
    );
  }

  if (platform === "android") {
    return (
      <ol className={wrap}>
        <li className={stepClass}>
          <span className={numClass}>1</span>
          <span className="flex-1 flex items-center flex-wrap gap-1">
            Tap the <b>menu</b> icon (three dots) in the top-right of Chrome:
            <span className={iconWrap} aria-hidden>
              <KebabIcon />
            </span>
          </span>
        </li>
        <li className={stepClass}>
          <span className={numClass}>2</span>
          <span className="flex-1">
            Tap <b>&ldquo;Install app&rdquo;</b> or{" "}
            <b>&ldquo;Add to Home screen&rdquo;</b> (wording depends on your
            Chrome version).
          </span>
        </li>
        <li className={stepClass}>
          <span className={numClass}>3</span>
          <span className="flex-1">
            Tap <b>Install</b> to confirm.
          </span>
        </li>
        <li className={stepClass}>
          <span className={numClass}>4</span>
          <span className="flex-1">
            Find <b>The Adulting Life</b> icon in your app drawer or on your
            home screen.
          </span>
        </li>
      </ol>
    );
  }

  if (platform === "desktop") {
    return (
      <ol className={wrap}>
        <li className={stepClass}>
          <span className={numClass}>1</span>
          <span className="flex-1 flex items-center flex-wrap gap-1">
            Look for the <b>install</b> icon in the browser address bar:
            <span className={iconWrap} aria-hidden>
              <DownloadIcon />
            </span>
          </span>
        </li>
        <li className={stepClass}>
          <span className={numClass}>2</span>
          <span className="flex-1">
            Click it, then <b>Install</b> in the small dialog that appears.
          </span>
        </li>
        <li className={stepClass}>
          <span className={numClass}>3</span>
          <span className="flex-1">
            If you don&apos;t see the icon: open the browser menu → look for
            <b> &ldquo;Install The Adulting Life&rdquo;</b>.
          </span>
        </li>
      </ol>
    );
  }

  // Unknown platform fallback
  return (
    <p className={isCompact ? "text-xs text-white/85" : "text-sm text-tal-plum"}>
      Open this page in your device&apos;s browser (Safari on iPhone, Chrome on
      Android or desktop), then use the browser&apos;s <b>Share</b> or{" "}
      <b>Menu</b> to find <b>&ldquo;Add to Home Screen&rdquo;</b> or{" "}
      <b>&ldquo;Install app&rdquo;</b>.
    </p>
  );
}

function IosShareIcon() {
  // The classic iOS share glyph: a box with an up-arrow escaping the top.
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3v13M8 7l4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 12v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusSquareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 8v8M8 12h8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="19" r="1.6" fill="currentColor" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3v13M8 12l4 4 4-4M5 20h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
