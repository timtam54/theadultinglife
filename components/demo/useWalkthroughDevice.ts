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

// Which version to play, plus the computer's Phone / Computer switch. On a
// computer the viewer can switch to the phone version (and back); on a phone
// there's no switch, because the computer version would be thumbnail-sized.
// `restart` is true after a switch made while playing, so the other version
// carries on full screen. See docs/Demo-Walkthroughs.md (rule 2).
export function useWalkthroughView(device: WalkthroughDevice = "auto") {
  const screen = useWalkthroughDevice("auto")
  const [chosen, setChosen] = useState<"phone" | "browser" | null>(null)
  const [restart, setRestart] = useState(false)
  const dev = device !== "auto" ? device : chosen ?? screen
  const canSwitch = device === "auto" && screen === "browser"
  return {
    dev,
    restart,
    switchTo: canSwitch
      ? (d: "phone" | "browser", playing: boolean) => {
          setChosen(d)
          setRestart(playing)
        }
      : undefined,
  }
}
