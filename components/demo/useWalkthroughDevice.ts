"use client"

// Which version of a walkthrough to play: the phone one under 768px wide, the computer one on
// wider screens - so a phone shows phone screens and a computer shows computer screens.
// device "phone" / "browser" forces one (e.g. /demo#tour-phone). null until the width is
// known, so the wrong version never flashes or autostarts. See docs/Demo-Walkthroughs.md.

import { useEffect, useState } from "react"

export type WalkthroughDevice = "auto" | "phone" | "browser"

export function useWalkthroughDevice(device: WalkthroughDevice = "auto"): "phone" | "browser" | null {
  const [dev, setDev] = useState<"phone" | "browser" | null>(device === "auto" ? null : device)
  useEffect(() => {
    if (device !== "auto") { setDev(device); return }
    const mq = window.matchMedia("(max-width: 767px)")
    const pick = () => setDev(mq.matches ? "phone" : "browser")
    pick()
    mq.addEventListener("change", pick)
    return () => mq.removeEventListener("change", pick)
  }, [device])
  return dev
}
