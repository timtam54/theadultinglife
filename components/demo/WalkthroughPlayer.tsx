"use client"

// A slideshow of hand-built app screens (sample data, no sign-in) that plays
// like a screen recording: each step shows a screen, eases in on the part that
// matters, shows what's clicked / tapped next (ripple + highlight ring), then
// moves on. Screens are drawn on a fixed canvas and scaled to fit, so every
// position is in canvas pixels:
//   device "browser" - 1200 x 760 canvas in a browser window, mouse cursor
//   device "phone"   - 390 x 844 canvas in a phone frame, finger taps
// A step can scroll a tall screen (scroll = px from the top); its focus / click /
// ring positions are in the screen's own (unscrolled) pixels.

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react"
import { createDemoMusic } from "./demoMusic"

export const CANVAS_W = 1200
export const CANVAS_H = 760
export const PHONE_W = 390
export const PHONE_H = 844

export interface WalkStep {
  /** Key into `screens` - steps that share a screen don't fade between them. */
  screen: string
  caption: string
  detail?: string
  /** Point to ease in on and how far. Omit for the whole screen. */
  focus?: { x: number; y: number; scale: number }
  /** Where the cursor clicks / the finger taps. */
  click?: { x: number; y: number }
  /** Box to ring. */
  ring?: { x: number; y: number; w: number; h: number }
  /** Scroll a tall screen down by this many px. */
  scroll?: number
  /** How long the step shows, ms (default 6500). */
  duration?: number
  /** Browser address bar for this step, when the walkthrough moves between pages (default: the player's `url`). */
  url?: string
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// The device's sides, top and bottom as 3D faces going back from the screen
// (needs transform-style: preserve-3d on the device). Flat-on they're edge-on and
// invisible; tilted, the side facing the viewer shows. Kept clear of the rounded
// corners so they don't stick out past them.
function DeviceEdges({ depth, border, radius }: { depth: number; border: number; radius: number }) {
  const side = "linear-gradient(to right, #9ca3af, #4b5563 35%, #1f2937)"
  const face: React.CSSProperties = { position: "absolute", pointerEvents: "none" }
  return (
    <>
      <span style={{ ...face, left: -border, top: radius, bottom: radius, width: depth, transformOrigin: "left center", transform: "rotateY(90deg)", background: side }} />
      <span style={{ ...face, right: -border, top: radius, bottom: radius, width: depth, transformOrigin: "right center", transform: "rotateY(-90deg)", background: side }} />
      <span style={{ ...face, top: -border, left: radius, right: radius, height: depth, transformOrigin: "center top", transform: "rotateX(-90deg)", background: "linear-gradient(to bottom, #9ca3af, #1f2937)" }} />
      <span style={{ ...face, bottom: -border, left: radius, right: radius, height: depth, transformOrigin: "center bottom", transform: "rotateX(90deg)", background: "linear-gradient(to top, #9ca3af, #1f2937)" }} />
    </>
  )
}

export default function WalkthroughPlayer({ steps: bodySteps, screens: bodyScreens, fixed = {}, title, device = "browser", url = "app.theadultinglife.com.au/dashboard", autoStart = false, intro, outro = true, popup = false, onExit }: {
  steps: WalkStep[]
  screens: Record<string, ReactNode>
  /** Per screen: parts that stay put while the screen scrolls (e.g. a pop-up's header bar). */
  fixed?: Record<string, ReactNode>
  /** Start playing full screen straight away (e.g. opened from /demo#risk). */
  autoStart?: boolean
  /** Shown only full screen, over the page (e.g. as a page's Tour) - nothing inline. Use with autoStart. */
  popup?: boolean
  /** Called when full screen is closed (X or Esc). */
  onExit?: () => void
  /** Title slide before the first step. */
  intro?: { title: string; subtitle?: string }
  /** The Adulting Life logo slide after the last step (default on). */
  outro?: boolean
  title?: string
  device?: "browser" | "phone"
  url?: string
}) {
  const phone = device === "phone"
  const W = phone ? PHONE_W : CANVAS_W
  const H = phone ? PHONE_H : CANVAS_H
  // Title slide first and logo slide last, drawn by the player itself.
  // (Memoised: a new step object each render would restart the step's timeline.)
  const introTitle = intro?.title, introSub = intro?.subtitle
  const steps: WalkStep[] = useMemo(() => [
    ...(introTitle ? [{ screen: "__intro", caption: introTitle, detail: introSub, duration: 4500 }] : []),
    ...bodySteps,
    ...(outro ? [{ screen: "__outro", caption: "The Adulting Life", detail: "Your life. Organised. Your future. Secured. - app.theadultinglife.com.au", duration: 5000 }] : []),
  ], [bodySteps, introTitle, introSub, outro])
  const screens: Record<string, ReactNode> = {
    ...bodyScreens,
    __intro: (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-[#fff5e6] via-[#fae6d0] to-[#f3d9b8] px-10 text-center text-[#23191b]" style={{ height: H }}>
        <motion.img src="/Logo.png" alt="The Adulting Life" className={phone ? "w-64" : "w-96"} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8 }} />
        <motion.p className={`font-display font-light leading-tight ${phone ? "text-3xl" : "text-5xl"}`} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.7 }}>{intro?.title}</motion.p>
        {intro?.subtitle && <motion.p className={`max-w-2xl text-[#6b545a] ${phone ? "text-base" : "text-2xl"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.7 }}>{intro.subtitle}</motion.p>}
      </div>
    ),
    __outro: (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-black via-[#23191b] to-black text-center text-white" style={{ height: H }}>
        <motion.img src="/LogoWhite.png" alt="The Adulting Life" className={phone ? "w-72" : "w-[30rem]"} initial={{ scale: 0.6, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: 0.9, type: "spring" }} />
        <motion.p className={phone ? "text-2xl" : "text-4xl"} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <span className="font-display font-light">Your life. Organised.</span>
        </motion.p>
        <motion.p className={`text-gray-300 ${phone ? "text-sm" : "text-xl"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>app.theadultinglife.com.au</motion.p>
      </div>
    ),
  }
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  // Nothing moves until Play; Play opens it full screen over the page (no site header / footer).
  const [started, setStarted] = useState(false)
  const [full, setFull] = useState(false)
  // Background music while it plays full screen (mute remembered on this device).
  const [muted, setMuted] = useState(false)
  const music = useRef<ReturnType<typeof createDemoMusic> | null>(null)
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0) // 0 enter, 1 zoomed, 2 pointer there, 3 clicked
  const [k, setK] = useState(1)
  const boxRef = useRef<HTMLDivElement>(null)
  const step = steps[i]

  // Scale the canvas to the width available.
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setK(el.clientWidth / W))
    ro.observe(el)
    setK(el.clientWidth / W)
    return () => ro.disconnect()
  }, [W])

  // Timeline for the current step.
  useEffect(() => {
    setPhase(0)
    if (!started) return
    const t: ReturnType<typeof setTimeout>[] = []
    t.push(setTimeout(() => setPhase(1), 900))
    if (step.click) {
      t.push(setTimeout(() => setPhase(2), 2200))
      t.push(setTimeout(() => setPhase(3), 3300))
    }
    if (playing) t.push(setTimeout(() => setI((n) => (n + 1 < steps.length ? n + 1 : n)), step.duration ?? 6500))
    return () => t.forEach(clearTimeout)
  }, [i, playing, started, step, steps.length])

  // Full screen: Esc closes it, and the page behind doesn't scroll.
  useEffect(() => {
    if (!full) return
    // Esc closes; arrow keys step back / forward (handy when presenting)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false)
      else if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, steps.length - 1))
      else if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0))
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev }
  }, [full, steps.length])
  useEffect(() => { try { setMuted(localStorage.getItem("demoMuted") === "1") } catch { /* storage blocked */ } }, [])
  useEffect(() => {
    if (!music.current) music.current = createDemoMusic()
    if (full && playing && !muted) music.current.start(); else music.current.pause()
  }, [full, playing, muted])
  useEffect(() => () => music.current?.stop(), [])
  const toggleMute = () => setMuted((m) => { try { localStorage.setItem("demoMuted", m ? "0" : "1") } catch { /* storage blocked */ } return !m })

  const play = (from?: number) => {
    if (from !== undefined) setI(from)
    setStarted(true); setFull(true); setPlaying(true)
    // Start the music inside the click itself - phones only allow sound from a tap.
    if (!muted) { if (!music.current) music.current = createDemoMusic(); music.current.start() }
  }

  // Opened from a link to this demo: play it full screen from the start.
  useEffect(() => { if (autoStart) play(0) // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  // Stop at the end.
  useEffect(() => { if (i === steps.length - 1) { const t = setTimeout(() => setPlaying(false), step.duration ?? 6500); return () => clearTimeout(t) } }, [i, steps.length, step.duration])

  const scroll = step.scroll ?? 0
  // Zoom: move the focus point (on screen, after scrolling) to the middle, without showing past the edges.
  const zoomed = phase >= 1 && !!step.focus && !reduce
  const s = zoomed ? step.focus!.scale : 1
  const fx = zoomed ? clamp(step.focus!.x, W / 2 / s, W - W / 2 / s) : W / 2
  const fy = zoomed ? clamp(step.focus!.y - scroll, H / 2 / s, H - H / 2 / s) : H / 2
  const tx = W / 2 - s * fx
  const ty = H / 2 - s * fy

  // Browser: the cursor rests bottom-right until a step clicks something.
  const cursor = step.click && phase >= 2 ? step.click : { x: W - 120, y: H - 80 + scroll }

  const go = (n: number) => { setI(clamp(n, 0, steps.length - 1)) }

  const canvas = (
    <div ref={boxRef} className={`relative w-full overflow-hidden bg-gray-100 ${phone ? "rounded-[2.2rem]" : "rounded-lg"}`} style={{ height: H * k }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${k})` }}>
        <motion.div className="absolute inset-0 origin-top-left" animate={{ x: tx, y: ty, scale: s }} transition={{ duration: 1.3, ease: [0.4, 0, 0.2, 1] }}>
          {/* Scrolled content: the screen plus everything positioned on it */}
          <motion.div className="absolute left-0 top-0 w-full" style={{ minHeight: H }} animate={{ y: -scroll }} transition={{ duration: 1.2, ease: "easeInOut" }}>
            <AnimatePresence initial={false}>
              <motion.div key={step.screen} className="absolute left-0 top-0 w-full" style={{ minHeight: H }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
                {screens[step.screen]}
              </motion.div>
            </AnimatePresence>

            {/* Highlight ring */}
            <AnimatePresence>
              {step.ring && phase >= 1 && (
                // Amber ring = look here / about to tap; turns blue and "presses" when clicked.
                <motion.div key={`ring-${i}`} className={`pointer-events-none absolute rounded-xl border-4 ${step.click && phase === 3 ? "border-blue-500 bg-blue-500/20" : "border-amber-400"}`}
                  style={{ left: step.ring.x - 6, top: step.ring.y - 6, width: step.ring.w + 12, height: step.ring.h + 12, boxShadow: "0 0 0 9999px rgba(15,23,42,0.18)" }}
                  initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: step.click && phase === 3 ? 0.97 : 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} />
              )}
            </AnimatePresence>

            {/* Click / tap ripple */}
            <AnimatePresence>
              {step.click && phase === 3 && (
                <motion.span key={`ripple-${i}`} className="pointer-events-none absolute rounded-full border-4 border-blue-500"
                  style={{ left: step.click.x - 30, top: step.click.y - 30, width: 60, height: 60 }}
                  initial={{ opacity: 0.9, scale: 0.2 }} animate={{ opacity: 0, scale: 1.4 }} transition={{ duration: 0.8 }} />
              )}
            </AnimatePresence>

            {phone ? (
              // Finger: a soft dot that lands on the tap point and presses.
              <AnimatePresence>
                {step.click && phase >= 2 && (
                  <motion.span key={`finger-${i}`} className="pointer-events-none absolute z-50 rounded-full border-2 border-white bg-gray-900/35 shadow-lg"
                    style={{ left: step.click.x - 22 / s, top: step.click.y - 22 / s, width: 44 / s, height: 44 / s }}
                    initial={{ opacity: 0, scale: 1.6 }} animate={{ opacity: 1, scale: phase === 3 ? 0.8 : 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} />
                )}
              </AnimatePresence>
            ) : (
              // Cursor (kept the same size while zoomed).
              <motion.div className="pointer-events-none absolute z-50"
                animate={{ left: cursor.x, top: cursor.y, scale: (phase === 3 ? 0.85 : 1) / s }}
                transition={{ duration: 1, ease: "easeInOut" }} style={{ transformOrigin: "0 0" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" className="drop-shadow-lg">
                  <path d="M4 2l16 9.5-7 1.5-3.5 7z" fill="#111827" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
        {/* Parts of the screen that don't scroll or zoom (e.g. a pop-up's header bar) */}
        {fixed[step.screen] && <div className="pointer-events-none absolute inset-0">{fixed[step.screen]}</div>}
      </div>
      {/* Before it starts: one big Play button */}
      {!started && (
        <button type="button" onClick={() => play(0)} aria-label="Play the demo"
          className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/35 text-white transition hover:bg-black/25">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black shadow-2xl ring-4 ring-white/70"><Play className="ml-1 h-9 w-9" /></span>
          <span className="rounded-full bg-black/50 px-4 py-1.5 text-sm font-semibold">Play the demo</span>
        </button>
      )}
    </div>
  )

  // Full screen: as big as fits the window height. The phone takes the whole height -
  // no title or step dots; its caption sits beside it and the controls float in a corner.
  const tall = full && phone
  const fullWidth = phone ? "min(100%, calc((100vh - 58px) * 390 / 844 + 26px))" : "min(100%, calc((100vh - 250px) * 1200 / 760 + 16px))"

  const controls = (
    <div className={`flex items-center gap-3 ${tall ? "rounded-full bg-white/90 p-1.5 shadow-lg ring-1 ring-gray-200" : ""}`}>
      <button type="button" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous" className="rounded-full border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
      {i === steps.length - 1 && !playing ? (
        <button type="button" onClick={() => play(0)} aria-label="Replay" className="rounded-full bg-black p-3 text-white shadow hover:bg-[#23191b]"><RotateCcw className="h-5 w-5" /></button>
      ) : (
        <button type="button" onClick={() => (full ? setPlaying(!playing) : play())} aria-label={playing ? "Pause" : "Play"} className="rounded-full bg-black p-3 text-white shadow hover:bg-[#23191b]">{playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
      )}
      <button type="button" onClick={() => go(i + 1)} disabled={i === steps.length - 1} aria-label="Next" className="rounded-full border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
      <button type="button" onClick={toggleMute} aria-label={muted ? "Turn music on" : "Mute music"} title={muted ? "Turn music on" : "Mute music"} className="rounded-full border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-50">{muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
    </div>
  )

  // Tell the page when full screen closes (popup mode: that's the whole player gone).
  const wasFull = useRef(false)
  useEffect(() => {
    if (full) wasFull.current = true
    else if (wasFull.current) { wasFull.current = false; onExit?.() }
  }, [full, onExit])
  if (popup && !full) return null

  return (
    <div className={full ? `fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-white to-gray-100 px-4 ${tall ? "py-4" : "py-6"}` : "w-full"}>
      {full && (
        <button type="button" onClick={() => { setFull(false); setPlaying(false) }} aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-full bg-gray-900 p-2.5 text-white shadow-lg hover:bg-gray-700"><X className="h-5 w-5" /></button>
      )}
      {title && !tall && <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-[#6b545a]">{title}</p>}

      {/* The device, with a slight 3D tilt when showing the whole screen */}
      <div style={{ perspective: 1800, ...(full ? { width: fullWidth } : {}) }} className={full ? "mx-auto" : phone ? "mx-auto w-full max-w-[340px]" : ""}>
        <motion.div
          animate={reduce ? {} : zoomed ? { rotateX: 0, rotateY: 0 } : phone ? { rotateX: 5, rotateY: i % 2 ? 12 : -12 } : { rotateX: 6, rotateY: i % 2 ? 7 : -7 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
          className={phone ? "relative rounded-[2.8rem] border-[3px] border-gray-700 bg-gray-950 p-2.5 shadow-2xl" : "relative rounded-2xl border border-gray-300 bg-gray-900 p-2 shadow-2xl"}
        >
          {/* Thickness: edge faces set back from the screen, so a tilt shows the side turned towards you */}
          {!reduce && <DeviceEdges depth={phone ? 26 : 20} border={phone ? 3 : 1} radius={phone ? 44 : 16} />}
          {phone ? (
            <>
              {canvas}
              {/* Dynamic island */}
              <div className="pointer-events-none absolute left-1/2 top-4 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 px-2 pb-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <span className="ml-3 flex-1 truncate rounded bg-gray-700 px-3 py-0.5 text-[11px] text-gray-300">{step?.url ?? url}</span>
              </div>
              {canvas}
            </>
          )}
        </motion.div>
      </div>

      {tall ? (
        <>
          {/* Caption beside the phone (wide screens), controls floating bottom-right */}
          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.4 }}
              className="absolute left-10 top-1/2 hidden max-w-sm -translate-y-1/2 lg:block">
              <p className="text-3xl font-bold leading-tight text-gray-900">{step.caption}</p>
              {step.detail && <p className="mt-3 text-lg text-gray-600">{step.detail}</p>}
            </motion.div>
          </AnimatePresence>
          <div className="absolute bottom-4 right-4">{controls}</div>
        </>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-3">
          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}
              className="min-h-[4rem] max-w-2xl text-center">
              <p className="text-lg font-bold text-gray-900"><span className="text-[#6b545a]">{i + 1}.</span> {step.caption}</p>
              {step.detail && <p className="mt-1 text-sm text-gray-600">{step.detail}</p>}
            </motion.div>
          </AnimatePresence>
          {controls}
          <div className="flex flex-wrap justify-center gap-1.5">
            {steps.map((_, n) => (
              <button key={n} type="button" onClick={() => go(n)} aria-label={`Step ${n + 1}`}
                className={`h-2 rounded-full transition-all ${n === i ? "w-6 bg-black" : "w-2 bg-gray-300 hover:bg-gray-400"}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
