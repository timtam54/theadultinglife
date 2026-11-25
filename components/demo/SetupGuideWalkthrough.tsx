"use client"

// "Setup guide" page walkthrough - the step-by-step first-time guide at
// /welcome. Hand-built copies of the real screens with a made-up family's
// sample data (the Taylors, Brisbane) - no sign-in, no API calls. "Today" is
// Mon 23 Nov 2026. Two versions (docs/Demo-Walkthroughs.md, rule 2):
//   computer - 1200 x 760. /welcome sits outside the app's sidebar layout: its
//              own white header (logo + Exit to Dashboard), max-w-5xl column.
//   phone    - 390 x 844, the same page at phone width (the step dots row is
//              wider than the screen, so the first and last dots run off the
//              edges exactly as on a real 390px phone).
// Covers every step in order: Hello (Take the tour again, How the pieces fit
// together + each circle's pop-up, the video placeholder, the four tiles,
// Where to start, Ask TAL AI, Show me around / Skip and explore on my own),
// Setup, Family (FamilyUsersPanel with the "added everyone?" check), the five
// Organiser sections (intro, bullets, "Folders in this section" matrix per
// family member with the Why? links, Keep going with ..., I've done enough for
// now, Skip this section), the step dots and "Step N of 8", Your progress,
// ← Back, Skip this step, the wrap-up, then the Dashboard's Setup guide card
// that brings you back to the first step you haven't done.
// It clicks into one folder from the guide (Emergency Contacts - the folder
// page with the "You're in the Setup Guide" banner: Return to Setup Guide /
// Next form; the sidebar is hidden while from=setup) and one Why? link (the
// Birth Certificate article, with the same banner).
// Copies: app/welcome/page.tsx + WelcomeWizard.tsx, lib/services/
// onboarding-wizard.ts (titles, short titles, subtitles), components/
// HowItFitsTogether, components/tour/RetakeTourButton, components/
// FamilyUsersPanel, components/CategoryMatrix (desktop table + MobileMatrix,
// the Setup Guide variant: Why? links, plain Planner marker, no AI column),
// content/course-articles (which folders have a Why? article),
// components/SetupReturnBanner, components/AppSidebar (hidden on from=setup),
// app/(app)/records/[category]/[subcategory] (+ the Emergency Contacts
// page_questions), app/(app)/learn/[category]/article/[id], and the
// dashboard's WizardResumeCard / ProgressCard (app/(app)/dashboard/page.tsx).
// The app shell and round buttons are copied from SettingsPageWalkthrough.
// If one of those changes, update the matching screen here.

import { useEffect, useState, type ReactNode } from "react"
import WalkthroughPlayer, { type WalkStep } from "./WalkthroughPlayer"
import { useWalkthroughView, type WalkthroughDevice } from "./useWalkthroughDevice"

type Rect = { x: number; y: number; w: number; h: number }

const Box = ({ x, y, w, h, children, className = "", style }: { x: number; y: number; w: number; h: number; children?: ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`absolute ${className}`} style={{ left: x, top: y, width: w, height: h, ...style }}>{children}</div>
)
const Img = ({ src, x, y, w, h, className = "rounded-xl" }: { src: string; x: number; y: number; w: number; h?: number; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className={`absolute object-cover ${className}`} style={{ left: x, top: y, width: w, height: h ?? w }} />
)
const Thumb = ({ src, size, className = "rounded-md" }: { src: string; size: number; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className={`shrink-0 bg-white object-cover ring-1 ring-tal-line ${className}`} style={{ width: size, height: size }} />
)

// Types the text out a letter at a time, each time its screen appears.
function Typed({ text, delay = 700, speed = 70 }: { text: string; delay?: number; speed?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let i = 0
    let iv: ReturnType<typeof setInterval> | undefined
    const t = setTimeout(() => {
      iv = setInterval(() => {
        i += 1
        setN(i)
        if (i >= text.length && iv) clearInterval(iv)
      }, speed)
    }, delay)
    return () => { clearTimeout(t); if (iv) clearInterval(iv) }
  }, [text, delay, speed])
  return <>{text.slice(0, n)}{n < text.length && <span className="ml-px inline-block h-4 w-px animate-pulse bg-tal-plum align-middle" />}</>
}

const mid = (b: Rect) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
const pad = (b: Rect, p = 4) => ({ x: b.x - p, y: b.y - p, w: b.w + p * 2, h: b.h + p * 2 })
const span = (a: Rect, b: Rect) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y) })
/** Lines a text wraps to at word breaks in `w` px, about `cw` px a character. */
function wrapLines(text: string, w: number, cw: number) {
  let lines = 1, cur = 0
  for (const word of text.split(" ")) {
    const ww = word.length * cw
    if (cur === 0) cur = ww
    else if (cur + cw + ww <= w) cur += cw + ww
    else { lines += 1; cur = ww }
  }
  return lines
}
// Character widths, a little generous so text never runs into what's under it.
const CB = 8.1 // text-base
const CS = 7.1 // text-sm
const CX = 6.1 // text-xs
const btnW = (t: string, padX = 20, cw = 7.4) => Math.round(t.length * cw + padX * 2)

// ── Icons (copied from nav-items.tsx, layout.tsx and the components) ────────

const sv = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const
const st = { stroke: "currentColor", strokeWidth: 1.6 } as const
const ICONS: Record<string, ReactNode> = {
  home: <svg {...sv}><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5Z" {...st} strokeLinejoin="round" /></svg>,
  sparkle: <svg {...sv}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" {...st} strokeLinecap="round" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>,
  folder: <svg {...sv}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" {...st} strokeLinejoin="round" /></svg>,
  doc: <svg {...sv}><path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" {...st} strokeLinejoin="round" /><path d="M15 3v4h4" {...st} /><path d="M9 12h6M9 16h6" {...st} strokeLinecap="round" /></svg>,
  receipt: <svg {...sv}><path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5V3Z" {...st} strokeLinejoin="round" /><path d="M9 8h6M9 12h6M9 16h4" {...st} strokeLinecap="round" /></svg>,
  plane: <svg {...sv}><path d="M3 12 21 4l-4 17-5-7-9-2Z" {...st} strokeLinejoin="round" /></svg>,
  robot: <svg {...sv}><rect x="4" y="7" width="16" height="12" rx="2" {...st} /><path d="M9 12h.01M15 12h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><path d="M12 4v3M8 19v2M16 19v2" {...st} strokeLinecap="round" /></svg>,
  check: <svg {...sv}><circle cx="12" cy="12" r="9" {...st} /><path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  bell: <svg {...sv}><path d="M6 9a6 6 0 0 1 12 0v5l1.5 2.5H4.5L6 14V9Z" {...st} strokeLinejoin="round" /><path d="M10 19a2 2 0 0 0 4 0" {...st} strokeLinecap="round" /></svg>,
  emergency: <svg {...sv}><path d="M12 2 3 20h18L12 2Z" {...st} strokeLinejoin="round" /><path d="M12 9v5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /><circle cx="12" cy="17" r="1.1" fill="currentColor" /></svg>,
  gear: <svg {...sv}><circle cx="12" cy="12" r="3" {...st} /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" {...st} strokeLinecap="round" /></svg>,
  card: <svg {...sv}><rect x="3" y="6" width="18" height="12" rx="2" {...st} /><path d="M3 10h18" {...st} /></svg>,
  map: <svg {...sv}><path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11Z" {...st} strokeLinejoin="round" /><circle cx="12" cy="10" r="2.5" {...st} /></svg>,
}
const NAV = [
  { t: "Dashboard", i: "home" }, { t: "Setup guide", i: "sparkle" }, { t: "The Adulting Life Organiser", i: "folder" },
  { t: "Documents", i: "doc" }, { t: "Receipts", i: "receipt", badge: "New" }, { t: "Peace of Mind Planner", i: "doc" },
  { t: "Learn", i: "plane", badge: "New" }, { t: "TAL AI", i: "robot" }, { t: "Tasks", i: "check" }, { t: "Reminders", i: "bell" },
  { t: "Emergency", i: "emergency" }, { t: "Settings", i: "gear" }, { t: "Subscription", i: "card" }, { t: "Maps", i: "map" },
]
const NAV_DASH = 0
const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
)
const PlusIcon = ({ size = 14, w = 2 }: { size?: number; w?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={w} strokeLinecap="round" /></svg>
)
const TalAiIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
)
const Avatar = ({ size = 36, text = "text-sm" }: { size?: number; text?: string }) => (
  <span className={`flex shrink-0 items-center justify-center rounded-full bg-black font-semibold text-white ${text}`} style={{ width: size, height: size }}>S</span>
)
// WelcomeWizard
const ExitIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l-5-5 5-5M5 12h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M12 9v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="12" cy="16.5" r="1" fill="currentColor" /></svg>
)
const ArrowIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const ResetIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 12a8 8 0 0 1-14 5.3M4 20v-4h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const VideoIcon = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M10 9l5 3-5 3V9Z" fill="currentColor" /></svg>
)
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
)
const FolderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
)
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 9a6 6 0 0 1 12 0v5l1.5 2.5H4.5L6 14V9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
)
// CategoryMatrix
const PlannerShareIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
)
const WhyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.5-1 1.1-1 1.7v.5" /><circle cx="12" cy="16.5" r="0.6" fill="currentColor" /></svg>
)
// PdfActions
const PdfIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><text x="8" y="17" fontSize="6" fontWeight="700" fill="currentColor">PDF</text></svg>
)
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
// ExportExcelButton
const ExcelIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="3" width="18" height="18" rx="3" fill="#1D6F42" /><path d="M8 7.5l8 9M16 7.5l-8 9" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
)
// SetupReturnBanner
const BannerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2v6M12 22v-6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M22 12h-6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" /></svg>
)
// HowItFitsTogether
const IconGuide = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" /></svg>
)
const IconFolder = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
)
const IconHeart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
)
const IconShare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" /><circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.7" /><circle cx="18" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.7" /><path d="M8 11l8-4M8 13l8 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
)

// The two round buttons, bottom right: HelpButton (?) and the tour compass.
function Fabs({ y, right }: { y: number; right: number }) {
  return (
    <>
      <Box x={right - 56} y={y} w={56} h={56} className="flex items-center justify-center rounded-full text-tal-plum shadow-xl">
        <span className="absolute inset-0 rounded-full border border-white/50" style={{ background: "linear-gradient(135deg, rgba(253,224,71,0.95) 0%, rgba(251,191,36,0.95) 55%, rgba(245,158,11,0.95) 100%)" }} />
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="relative" aria-hidden><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" opacity="0.55" /><path d="M9.4 9.2a2.6 2.6 0 015.05.85c0 1.35-.9 1.8-1.75 2.25-.7.37-1.2.72-1.2 1.55v.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><circle cx="11.5" cy="17.1" r="1.1" fill="currentColor" /></svg>
      </Box>
      <Box x={right - 128} y={y} w={56} h={56} className="flex items-center justify-center rounded-full text-white shadow-xl">
        <span className="absolute inset-0 rounded-full border border-white/40" style={{ background: "linear-gradient(135deg, rgba(30,58,138,0.95) 0%, rgba(37,99,235,0.95) 55%, rgba(2,132,199,0.95) 100%)" }} />
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="relative" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.65" /><path d="M15 9l-2 5-5 2 2-5 5-2z" fill="currentColor" /></svg>
      </Box>
    </>
  )
}

// ── The two layouts ──────────────────────────────────────────────────────────

/** Where things sit for each device. `cx`/`cw` = the /welcome column (max-w-5xl, px-10 / px-3). */
interface V { phone: boolean; W: number; H: number; cx: number; cw: number; pad: number; hdr: number }
const DV: V = { phone: false, W: 1200, H: 760, cx: 128, cw: 944, pad: 40, hdr: 0 }
const PV: V = { phone: true, W: 390, H: 844, cx: 12, cw: 366, pad: 16, hdr: 44 }

// App header controls (layout.tsx / HeaderQuickBar / UserMenu)
const SB = 240
const navY = (k: number) => 168 + k * 41
const ASK = { x: 850, y: 12, w: 128, h: 40 }
const BELL = { x: 986, y: 12, w: 40, h: 40 }
const USER = { x: 1042, y: 14, w: 134, h: 36 }
const P_ASK = { x: 140, y: 58, w: 72, h: 36 }
const P_BELL = { x: 218, y: 56, w: 40, h: 40 }
const P_USER = { x: 262, y: 58, w: 64, h: 40 }
const P_MENU = { x: 334, y: 56, w: 40, h: 40 }
const FAB = (v: V) => (v.phone ? { y: 764, right: 366 } : { y: 680, right: 1176 })

const StatusBar = () => (
  <Box x={0} y={0} w={390} h={44} className="flex items-center justify-between px-7 text-sm font-semibold text-tal-plum-dark"><span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span></Box>
)
/** The app's computer layout. `side={false}` = the sidebar hidden (any URL with from=setup). */
function DShell({ children, h, nav = NAV_DASH, side = true }: { children: ReactNode; h: number; nav?: number; side?: boolean }) {
  const hx = side ? SB : 0
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      {side && (
        <>
          <Box x={0} y={0} w={SB} h={h} className="bg-black text-white" />
          <Img src="/icons-pwa/icon-192.png" x={76} y={20} w={88} />
          <Box x={0} y={114} w={SB} h={48} className="text-center text-[11px] leading-snug text-white/60">Your life. Organised.<br />Your future. Secured.<div className="mt-1 text-[10px] text-white/45">TAL = The Adulting Life</div></Box>
          {NAV.map((n, k) => (
            <Box key={n.t} x={12} y={navY(k)} w={216} h={37}
              className={`flex items-center gap-3 rounded-xl px-3 text-[13px] ${k === nav ? "bg-tal-cream-soft font-medium text-tal-plum" : "text-white/85"}`}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">{ICONS[n.i]}</span>
              <span className="flex-1 truncate">{n.t}</span>
              {n.badge && <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${k === nav ? "bg-black text-white" : "bg-white text-black"}`}>{n.badge}</span>}
            </Box>
          ))}
        </>
      )}
      <Box x={hx} y={0} w={1200 - hx} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Box x={hx + 24} y={12} w={384} h={40} className="flex items-center gap-2 rounded-full border border-tal-line bg-white pl-3 text-sm">
        <span className="text-tal-plum-soft"><SearchIcon /></span><span className="text-tal-plum-soft">Search your organiser…</span>
      </Box>
      <Box x={hx + 416} y={12} w={84} h={40} className="flex items-center justify-center gap-1.5 rounded-full border border-tal-line bg-white text-sm font-medium"><PlusIcon />Add</Box>
      <Box {...ASK} className="flex items-center justify-center gap-2 rounded-full bg-black text-sm font-medium text-white"><TalAiIcon />Ask TAL AI</Box>
      <Box {...BELL} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
      <Box {...USER} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm"><Avatar />Hi Sarah<span className="text-xs text-tal-plum-soft">▾</span></Box>
      {children}
    </div>
  )
}
function PShell({ children, h }: { children: ReactNode; h: number }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      <StatusBar />
      <Box x={0} y={44} w={390} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Img src="/icons-pwa/icon-192.png" x={16} y={58} w={36} />
      <Box {...P_ASK} className="flex items-center justify-center gap-1.5 rounded-full bg-black text-xs font-medium text-white"><TalAiIcon size={14} />TAL AI</Box>
      <Box {...P_BELL} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
      <Box {...P_USER} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2"><Avatar /><span className="text-xs text-tal-plum-soft">▾</span></Box>
      <Box {...P_MENU} className="flex items-center justify-center rounded-full">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </Box>
      {children}
    </div>
  )
}
const AppShell = ({ v, h, side = true, children }: { v: V; h: number; side?: boolean; children: ReactNode }) =>
  v.phone ? <PShell h={h}>{children}</PShell> : <DShell h={h} side={side}>{children}</DShell>

/** A fixed, centred dialog of width `w`, `h` tall, at scroll `at`. */
const centred = (v: V, at: number, w: number, h: number): Rect => {
  const ww = Math.min(w, v.W - 32)
  return { x: Math.round((v.W - ww) / 2), y: Math.round(at + Math.max(16, (v.H - h) / 2)), w: ww, h }
}

// ── Wording (from the components) ────────────────────────────────────────────

type Sid = "hello" | "welcome" | "family" | "personal" | "health" | "education" | "employment" | "admin" | "finish"
type CatId = "personal" | "health" | "education" | "employment" | "admin"
const ORDER: Sid[] = ["hello", "welcome", "family", "personal", "health", "education", "employment", "admin"]
const CATS: CatId[] = ["personal", "health", "education", "employment", "admin"]
// lib/services/onboarding-wizard.ts WIZARD_STEPS
const META: Record<Sid, { title: string; short: string; sub: string }> = {
  hello: { title: "Welcome to The Adulting Life", short: "Hello", sub: "A quick tour of what's inside and where to start. About 60 seconds." },
  welcome: { title: "Let's set up your Organiser", short: "Setup", sub: "Here's how the Setup Guide walks you through it." },
  family: { title: "Add people in your family", short: "Family", sub: "Partner, kids, anyone else you'll be organising for. You can add more later." },
  personal: { title: "Personal Information", short: "Personal", sub: "This section covers emergency contacts, ID documents, and general information about you and your family." },
  health: { title: "Health & Wellbeing", short: "Health", sub: "This section covers medical advisers, health plan, medications." },
  education: { title: "Education", short: "Education", sub: "This section covers courses, enrolment details, qualifications. If it does not apply right now, you can skip it." },
  employment: { title: "Employment", short: "Employment", sub: "This section covers employer details, contracts and pay. Keep it updated so your important work info is always easy to find." },
  admin: { title: "Admin & Bookkeeping", short: "Admin", sub: "This section covers bank accounts, vehicles, insurance, utilities and everyday admin." },
  finish: { title: "You're doing great!", short: "Finish", sub: "Here's a snapshot of your Organiser so far." },
}
const EXPLAIN_B = "The Setup Guide walks you through your Organiser section by section."
const EXPLAIN = "Everything you type here is saved directly into your Organiser folders — nothing is duplicated, and you can jump back to any folder from the Organiser at any time. Tap a numbered step above to move around."
const HELLO_P = "Hi Sarah 👋 The Adulting Life is where all your important household information lives — organised, secure, and ready when you or your family need it. Here's how the pieces fit together."
const TILES = [
  { title: "Setup Guide", body: "Your starting point. Walks you through each Organiser section step-by-step. Everything you enter goes straight into your Organiser folders — no double entry, come back any time.", accent: "bg-violet-50 ring-violet-100", image: "/thumbnails/welcome/setup-guide.webp" },
  { title: "The Adulting Life Organiser", body: "The heart of the app. Personal, Health, Education, Employment and Admin folders — every important document and detail in one searchable place.", accent: "bg-amber-50 ring-amber-100", image: "/thumbnails/welcome/organiser.webp" },
  { title: "Peace of Mind Planner", body: "For the things that matter most. Letters, wishes, funeral plans and last words — ready if your family ever needs them.", accent: "bg-emerald-50 ring-emerald-100", image: "/thumbnails/learn/peace-of-mind-planner.webp" },
  { title: "Sharing", body: "You choose what — and who. Grant another Adulting Life user access to specific folders or items. Revoke any time.", accent: "bg-sky-50 ring-sky-100", image: "/thumbnails/welcome/sharing.webp" },
]
const WHERE = "Where to start: the Setup Guide. It walks you through everything, one bite-size step at a time. You can stop, save, and pick it up again whenever it suits."
const TAL_P = "Anywhere in the app, tap Ask TAL AI (top right) and ask anything — “What goes in the Peace of Mind Planner?”, “How do I share my will with my partner?”, “What's a TFN?” TAL walks you through every section, explains every field, and stays with you the whole way."
const FLOW_FOOT = "Tap any circle to learn more. Setup fills your Organiser. Your Planner holds what matters most. You choose who to share with."
// HowItFitsTogether NODES
const NODES = [
  { color: "#ede9fe", chip: "bg-violet-100", label: "Setup Guide", body: "Walks you through, section by section.", icon: <IconGuide />,
    what: "The Setup Guide is exactly what you're using right now — a step-by-step walkthrough of the essentials. Everything you type into it saves straight into your Organiser folders, so there's no double entry.",
    example: "For example: when you enter your Medicare number in the Setup Guide, it lands in the Health folder in your Organiser automatically." },
  { color: "#fef3c7", chip: "bg-amber-100", label: "Organiser", body: "Everything you filled in lives here.", icon: <IconFolder />,
    what: "The Organiser is the heart of the app — folders for Personal, Health, Employment, Admin and more, with a column for every family member. Anything you enter (through the Setup Guide, forms, or uploads) lives here so you can find it fast when you need it.",
    example: "For example: passport expiry, private-health-fund details, car rego, kids' immunisation records — all filed by folder and by person.", goto: "Open the Organiser" },
  { color: "#d1fae5", chip: "bg-emerald-100", label: "Planner", body: "For the things that matter most.", icon: <IconHeart />,
    what: "The Peace of Mind Planner is different from the Organiser. This is for the things that matter most — letters to loved ones, funeral wishes, last words, who to call if something happens. Ready if your family ever needs them.",
    example: "For example: a letter to your kids, your preferred funeral songs, or where the will is kept.", goto: "Open the Planner" },
  { color: "#e0f2fe", chip: "bg-sky-100", label: "Sharing", body: "Grant access to people you choose.", icon: <IconShare />,
    what: "Sharing isn't a separate page — it's a Share button on every folder and Planner section. You choose exactly what to share, with whom, and can revoke it any time. Nothing is ever shared unless you deliberately share it.",
    example: "For example: share the Emergency Contacts folder with a sibling, or the whole Planner with your partner." },
]
const WELCOME_P = "We'll walk you through your Adulting Life Organiser section by section. You can go as fast or slow as you like."
const WELCOME_LIST = [
  "Add people in your family: partner, kids, anyone you're organising for",
  "Personal Information: emergency contacts, IDs, general info",
  "Health & Wellbeing: medical advisers, health plan, medications",
  "Education and Employment: skip either if they don't apply",
  "Admin & Bookkeeping: bank, vehicles, insurances, utilities",
]
const FAMILY_P = "Who else will you be organising for? Add your partner, kids, or anyone else in your household so their records live in the same place as yours. You can always add more later."
const PANEL_P = "Add the people who are important in your life, along with their key personal details. This could include your partner, children or other family members. Keeping this information together makes it easier to manage important records and access details when needed."
const PANEL_Q = "Have you added everyone in your family? Or are there more members to add?"
const PANEL_DONE = "You've marked your family list as complete."
// WelcomeWizard SECTION_INTROS
const INTROS: Record<CatId, { intro: string; bullets: string[] }> = {
  personal: {
    intro: "This section is all about you and your people. Start with emergency contacts and your ID documents first, then add the rest of your Personal Information when it suits you.",
    bullets: ["Emergency contacts (who we'd call if something happened)", "Details for yourself and each family member (in Family Members)", "Birth certificate, passport, driver's licence and other IDs", "Fill in the form provided, upload a scanned copy, or do both. Totally your choice."],
  },
  health: {
    intro: "This section covers medical advisers, your health plan, medications you're on. Handy if you or a family member ever need urgent care.",
    bullets: ["Your GP and any specialists you see", "Your health plan and any allergies or conditions", "Medications and dosages"],
  },
  education: {
    intro: "This section is for study, courses and qualifications. Add anything you are currently studying, qualifications you have completed, and your enrolment details. You can fill in the form provided, upload a scanned copy, or do both. If nobody in your family is studying right now, feel free to skip this section.",
    bullets: ["Current courses and enrolment details", "Past qualifications and certificates", "Student ID and campus info", "Fill in the form, upload a scan, or do both. Totally your choice."],
  },
  employment: {
    intro: "This section is all about your work life. Add your employer details, contracts, tax and super information, plus pay records and other important employment documents. Give it a quick update whenever something changes, because a little admin now saves a whole lot of headaches later.",
    bullets: ["Current employer and role", "Contract and super fund", "Pay history and important employment documents", "Update your details whenever something changes"],
  },
  admin: {
    intro: "This section is all about the practical everyday admin that keeps life ticking along. Add your bank accounts, vehicles, insurance, utilities and other important details so they are easy to find when you need them. You can also scan in and store your receipts here to help keep your paperwork nice and tidy.",
    bullets: ["Bank accounts and financial advisers", "Vehicle registrations and insurance policies", "Utility accounts and other important admin", "Scan in and store your receipts"],
  },
}
const FINISH_P = "Each section you complete helps keep your important information organised, up to date and ready when you need it."
const PUSH_P = "We'll send you a notification when a licence, rego or insurance is coming up. Nothing else. You can turn it off any time."

// ── Sample data (the Taylors of Brisbane, "today" 23 Nov 2026) ──────────────

// Each section's "Folders in this section" matrix - Sarah, James, Mia (15),
// Leo (11). Folder names are the live ones (same list as the Organiser
// walkthrough: ABN and Dental Records hidden by the Taylors, Tax File Number
// never shown). "—" = under the folder's min_age. Fewer than half of each
// section's folders are started, so no section ticks itself off.
type Cell = "done" | "started" | "empty" | "na"
const CK: Record<string, Cell> = { d: "done", s: "started", e: "empty", n: "na" }
type MRow = { id: string; name: string; cells?: Cell[]; fam?: Cell; users?: boolean; planner?: boolean }
const mr = (id: string, name: string, cells: string, planner = false): MRow => ({ id, name, cells: cells.split("").map((k) => CK[k]), planner })
const famRow = (id: string, name: string, state: Cell, users = false): MRow => ({ id, name, fam: state, users })
const MATRIX: Record<CatId, MRow[]> = {
  personal: [
    mr("personal.emergency_contacts", "Emergency Contacts", "seee"),
    famRow("personal.family_members", "Family Members", "done", true),
    mr("personal.birth_certificates", "Birth Certificates", "deee"),
    mr("personal.marriage_certificate", "Marriage Certificate", "eenn"),
    mr("personal.passport_travel", "Passport & Travel Documents", "eeee"),
    mr("personal.will_funeral", "Will & Funeral Instructions", "eenn", true),
    mr("personal.power_of_attorney", "Power of Attorney Details", "eenn", true),
    mr("personal.advanced_health_directive", "Advanced Health Directive", "eenn", true),
    mr("personal.electoral_roll", "Electoral Roll Number & Registered Address", "ddnn"),
    mr("personal.drivers_licence", "Driver's Licence", "dsnn"),
    mr("personal.list_of_accounts", "Custom — List of Personal Accounts", "eeee", true),
    mr("personal.licences_ids", "Copy of Licences & ID's", "eeee"),
    mr("personal.vehicle_details", "Custom — Vehicle Details & Copy of Registration Certificate", "eenn", true),
    mr("personal.vehicle_logbook", "Vehicle Logbook", "eenn"),
    mr("personal.device_access", "Custom — Device Access Details", "eeee", true),
    mr("personal.end_of_life_wishes", "Custom — End of Life Wishes", "eeee"),
  ],
  health: [
    mr("health.medical_advisers", "List of Medical Advisers", "deee", true),
    mr("health.medication_list", "Custom — Medication List", "eeee"),
    mr("health.health_insurance_cards", "Health Cards", "dddd"),
    mr("health.concession_cards", "Concession Cards", "eeee"),
    mr("health.pension_cards", "Pension Cards", "eeee"),
    mr("health.health_insurance", "Health Insurance Details & Statements", "eeee", true),
    mr("health.life_insurance", "Life Insurance Details & Statements", "eeee", true),
    mr("health.my_health_plan", "My Health Plan", "eeee"),
    mr("health.scripts", "Copies of Scripts / Prescriptions", "deee"),
    mr("health.blood_tests", "Blood Test Results", "eeee"),
    mr("health.specialist_reports", "Specialist Reports", "eeee"),
    mr("health.referrals", "Referrals", "eeee"),
    mr("health.hospital_discharge", "Hospital Discharge Records", "eeee"),
    mr("health.medical_reports", "Medical Reports", "eeee"),
    mr("health.medical_bills", "Medical Bills", "eeee"),
    mr("health.meal_planning", "Meal Planning", "eeee"),
    mr("health.favourite_recipes", "Favourite Recipes", "eeee"),
    mr("health.life_goals_plans", "Life Goals & Plans", "eeee"),
    mr("health.mind_set", "Mindset", "eeee"),
    mr("health.retirement_pension", "Retirement / Pension Plan", "eeee"),
  ],
  education: [
    mr("education.courses_enrolment", "Custom Courses & Enrolments", "eeee"),
    mr("education.primary_details", "Primary Education", "eeds"),
    mr("education.primary_reports", "Primary Reports & Certificates", "eeee"),
    mr("education.secondary_details", "Secondary Education", "deee"),
    mr("education.secondary_reports", "Secondary Reports & Certificates", "eeee"),
    mr("education.tertiary_details", "Tertiary Education", "eeee"),
    mr("education.tertiary_reports", "Tertiary Transcripts & Certificates", "eeee"),
    mr("education.other_courses_details", "Other Education", "eeee"),
    mr("education.achievement_certificates", "Achievement Certificates", "eeee"),
    mr("education.study_plan", "Study Plan", "eeee"),
    mr("education.course_storage", "Course Storage", "eeee"),
    famRow("education.other", "Other", "empty"),
  ],
  employment: [
    mr("employment.employee_information_form", "Employee Information Form", "deen"),
    mr("employment.cover_letter", "Cover Letter", "eeee"),
    mr("employment.resume", "Resume", "seee"),
    mr("employment.letters_of_recommendation", "Letters of Recommendation", "eeee"),
    mr("employment.volunteering_certificates", "Volunteering Certificates", "eeee"),
    mr("employment.employee_contracts", "Employee Contracts", "deee"),
    mr("employment.job_description", "Position / Job Description", "eeee"),
    mr("employment.employment_reviews", "Employment Reviews", "eeee"),
    mr("employment.correspondence", "Correspondence", "eeee"),
    mr("employment.wages_summaries", "Wages Summaries", "eeee"),
    mr("employment.annual_payment_summary", "Annual Payment Summary Report", "eeee"),
    mr("employment.other", "Other", "eeee"),
  ],
  admin: [
    mr("admin.bank_accounts_advisers", "List of Bank Accounts & Advisers", "dden", true),
    mr("admin.bank_statements", "Bank Statements", "eeen"),
    mr("admin.loans", "Loans", "eeee"),
    mr("admin.loan_statements", "Loan Statements", "eeee", true),
    mr("admin.budgets", "Budgets", "eeee", true),
    mr("admin.investments_deeds", "Investments, Shares & Deeds", "eenn", true),
    mr("admin.super_statements", "Superannuation Funds", "eenn", true),
    mr("admin.super_statement_documents", "Superannuation Statements", "eeee"),
    famRow("admin.property_records", "Property Records", "done"),
    mr("admin.annual_tax_report", "Annual Taxation Report", "eeee"),
    mr("admin.tax_payment_plans", "Tax Payment Plans", "eeee"),
    mr("admin.home_insurance", "Home Insurance", "deee", true),
    mr("admin.other_business_insurance", "Other Business / Property Insurance", "eeee"),
    mr("admin.vehicle_insurance", "Vehicle Insurance Policies", "denn", true),
    mr("admin.telephone_devices", "Telephones & Devices Contracts", "eeee"),
    mr("admin.telephone_devices_statements", "Telephones & Devices Statements", "eeee"),
    mr("admin.electricity_gas", "Electricity & Gas Accounts", "deee"),
    mr("admin.electricity_gas_bills", "Electricity & Gas Bills", "eeee"),
    mr("admin.rates_water", "Rates & Water", "eeee"),
    mr("admin.rental_agreements", "Rental Agreements", "eeee"),
    mr("admin.warranties", "Warranties on devices & tools", "eeee"),
    famRow("admin.other", "Other", "empty"),
    famRow("admin.invoices_jul_jun", "Invoices July to June", "empty"),
  ],
}
// Folders with a course article (content/course-articles subcategoryId) - the "Why?" link.
const WHY = new Set([
  "personal.birth_certificates", "personal.marriage_certificate", "personal.passport_travel", "personal.will_funeral", "personal.power_of_attorney",
  "personal.advanced_health_directive", "personal.electoral_roll", "personal.list_of_accounts", "personal.vehicle_details",
  "health.health_insurance", "health.my_health_plan", "health.scripts", "health.blood_tests", "health.specialist_reports", "health.hospital_discharge",
  "health.medical_bills", "health.meal_planning", "health.life_goals_plans", "health.mind_set", "health.retirement_pension",
  "education.courses_enrolment", "education.primary_details", "education.secondary_details", "education.tertiary_details",
  "education.achievement_certificates", "education.study_plan", "education.course_storage",
  "employment.employee_information_form", "employment.cover_letter", "employment.resume", "employment.letters_of_recommendation",
  "employment.volunteering_certificates", "employment.employee_contracts", "employment.job_description", "employment.employment_reviews",
  "employment.correspondence", "employment.wages_summaries", "employment.annual_payment_summary",
  "admin.bank_statements", "admin.loan_statements", "admin.budgets", "admin.investments_deeds", "admin.super_statements", "admin.property_records",
  "admin.annual_tax_report", "admin.tax_payment_plans", "admin.home_insurance", "admin.vehicle_insurance", "admin.telephone_devices",
  "admin.electricity_gas", "admin.rates_water", "admin.rental_agreements",
])
const PEOPLE = [
  { n: "Sarah Taylor", k: "adult · primary", short: "Sarah Taylor" }, { n: "James Taylor", k: "adult", short: "James Taylor" },
  { n: "Mia Taylor", k: "child", short: "Mia Taylor" }, { n: "Leo Taylor", k: "child", short: "Leo Taylor" },
]
const FAMILY = [
  { n: "Sarah Taylor", k: "adult", e: "sarah.taylor@example.com", primary: true },
  { n: "James Taylor", k: "adult", e: "james.taylor@example.com" },
  { n: "Mia Taylor", k: "child" },
  { n: "Leo Taylor", k: "child" },
]
const CELL: Record<Cell, { s: string; c: string; bg: string }> = {
  done: { s: "✓", c: "text-green-700 font-bold", bg: "bg-green-50" },
  started: { s: "◐", c: "text-amber-700 font-bold", bg: "bg-amber-50" },
  empty: { s: "✗", c: "text-red-700 font-bold", bg: "bg-red-50" },
  na: { s: "—", c: "text-tal-plum-soft", bg: "" },
}
const thumbOf = (id: string) => `/thumbnails/subcategories/${id}.webp`

/** The rows after Sarah has saved her Emergency Contacts entry (`ec`). */
function rowsFor(cat: CatId, ec: boolean): MRow[] {
  const rows = MATRIX[cat]
  if (cat !== "personal" || !ec) return rows
  return rows.map((r) => (r.id === "personal.emergency_contacts" ? { ...r, cells: ["done", "empty", "empty", "empty"] as Cell[] } : r))
}
/** page.tsx: complete (folderIsComplete) / started / empty, for the whole family. */
function folderStatus(r: MRow): "complete" | "started" | "empty" {
  const cells = r.fam ? [r.fam] : (r.cells ?? []).filter((c) => c !== "na")
  if (cells.length && cells.every((c) => c === "done")) return "complete"
  if (cells.some((c) => c === "done" || c === "started")) return "started"
  return "empty"
}
function summary(cat: CatId, ec: boolean) {
  const rows = rowsFor(cat, ec)
  const sts = rows.map(folderStatus)
  const firstStarted = rows.find((r, i) => sts[i] === "started")
  const firstEmpty = rows.find((r, i) => sts[i] === "empty")
  const go = firstStarted ? `Keep going with ${firstStarted.name} →` : firstEmpty ? `Start with ${firstEmpty.name} →` : "Open this section →"
  return { rows, completed: sts.filter((s) => s === "complete").length, started: sts.filter((s) => s !== "empty").length, total: rows.length, go }
}
const ALL_FOLDERS = CATS.reduce((a, c) => a + MATRIX[c].length, 0)
const ALL_DONE = CATS.reduce((a, c) => a + MATRIX[c].filter((r) => folderStatus(r) === "complete").length, 0)
const PCT = Math.round((ALL_DONE / ALL_FOLDERS) * 100)

// ── The Setup guide page (app/welcome + WelcomeWizard) ──────────────────────

interface St {
  step: Sid
  done: Sid[]
  open?: boolean // "Your progress" expanded
  node?: number // a How-the-pieces-fit circle's pop-up
  at?: number // scroll, for the pop-up
  famAll?: boolean // "Yes, everyone is added"
  ec?: boolean // Sarah's Emergency Contacts saved
  push?: boolean // notifications turned on
}
interface Built { el: ReactNode; h: number; r: Record<string, Rect> }

function wizard(v: V, s: St): Built {
  const P = v.phone
  const r: Record<string, Rect> = {}
  const n: ReactNode[] = []
  const put = (name: string | null, rect: Rect, cls: string, node?: ReactNode) => {
    if (name) r[name] = rect
    n.push(<Box key={n.length} {...rect} className={cls}>{node}</Box>)
  }
  const isFinish = s.step === "finish"
  const idx = ORDER.indexOf(s.step)
  const isDone = (id: Sid) => s.done.includes(id)
  const doneCount = ORDER.filter(isDone).length
  const meta = META[s.step]
  const { cx, cw } = v
  const ix = cx + v.pad, iw = cw - v.pad * 2

  // Header: logo + Exit to Dashboard
  put(null, { x: 0, y: v.hdr, w: v.W, h: 64 }, "border-b border-tal-line/60 bg-white/60")
  put("logo", { x: cx, y: v.hdr + 14, w: 36, h: 36 }, "", <Img src="/icons-pwa/icon-192.png" x={0} y={0} w={36} />)
  put("exit", { x: cx + cw - 152, y: v.hdr + 14, w: 152, h: 36 }, "flex items-center justify-center gap-1.5 rounded-lg border border-tal-line bg-white text-sm text-tal-plum", <><ExitIcon />Exit to Dashboard</>)

  let y = v.hdr + 64 + (P ? 24 : 40)
  if (s.step !== "hello" && !isFinish) {
    const tw = cw - 32 - 32 - 12
    const h = Math.max(32, wrapLines(`${EXPLAIN_B} ${EXPLAIN}`, tw, CS) * 23) + 26
    put("explain", { x: cx, y, w: cw, h }, "flex items-start gap-3 rounded-2xl border border-tal-line bg-tal-cream px-4 py-3",
      <><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tal-plum/10"><InfoIcon /></span><div className="text-sm leading-relaxed"><span className="font-medium">{EXPLAIN_B}</span> {EXPLAIN}</div></>)
    y += h + 16
  }

  // ProgressDots
  if (!P) { put(null, { x: cx, y, w: cw, h: 16 }, "text-center text-[11px] leading-4 text-tal-plum-soft", "Tap any number to jump to that step"); y += 24 }
  const stepW = P ? 54 : 76, colW = P ? 44 : 56, conW = P ? 6 : 12, gap = P ? 2 : 4
  const x0 = (P ? 195 : cx + cw / 2) - (7 * stepW + colW) / 2
  const dotsTop = y
  ORDER.forEach((id, i) => {
    const colX = x0 + i * stepW
    const active = i === idx, dn = isDone(id)
    const size = active ? (P ? 36 : 40) : (P ? 28 : 32)
    const c = { x: colX + (colW - size) / 2, y, w: size, h: size }
    put(`dot:${id}`, c, `flex items-center justify-center rounded-full font-semibold ${active ? `${P ? "text-xs" : "text-sm"} bg-tal-plum text-white shadow-md ring-2 ring-tal-plum ring-offset-2` : dn ? `${P ? "text-[11px]" : "text-xs"} bg-black text-white` : `${P ? "text-[11px]" : "text-xs"} bg-white text-tal-plum-soft ring-1 ring-tal-line`}`, i + 1)
    if (dn && !active) put(null, { x: c.x + size - 12, y: c.y - 4, w: 16, h: 16 }, "flex items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white", "✓")
    put(null, { x: colX - 4, y: y + size + 6, w: colW + 8, h: 14 }, `text-center leading-tight ${P ? "text-[9px]" : "text-[10px]"} ${active ? "font-semibold text-tal-plum" : dn ? "text-tal-plum" : "text-tal-plum-soft"}`, META[id].short)
    if (i < 7) put(null, { x: colX + colW + gap, y: y + 16, w: conW, h: 2 }, dn ? "bg-black" : "bg-tal-line")
  })
  y += P ? 56 : 60
  r.dots = { x: Math.max(0, x0 - 4), y: dotsTop - 6, w: Math.min(v.W, 7 * stepW + colW + 8), h: y - dotsTop + 6 }

  // The white card
  y += 32
  const cardTop = y
  const cardIdx = n.length
  n.push(null)
  let cy = cardTop + v.pad
  put("label", { x: ix, y: cy, w: iw, h: 15 }, "text-[10px] font-medium uppercase leading-[15px] tracking-widest text-tal-plum-soft",
    isFinish ? `Wrap up · ${doneCount} of 8 done` : `Step ${idx + 1} of 8 · ${doneCount} done`)
  cy += 19
  const tH = wrapLines(meta.title, iw, P ? 16.5 : 21) * (P ? 38 : 45)
  put("title", { x: ix, y: cy, w: iw, h: tH }, `font-display leading-tight ${P ? "text-3xl" : "text-4xl"}`, meta.title)
  cy += tH + 8
  const subH = wrapLines(meta.sub, iw, CB) * 24
  put("sub", { x: ix, y: cy, w: iw, h: subH }, "leading-6 text-tal-plum-soft", meta.sub)
  cy += subH + 16
  // ProgressChecklist (<details>)
  const listH = s.open ? 8 * 28 + 7 * 6 + 16 : 0
  put("progress", { x: ix, y: cy, w: iw, h: 44 + listH }, "rounded-xl border border-tal-line bg-tal-cream-soft/60")
  put("progressSum", { x: ix, y: cy, w: iw, h: 44 }, "flex items-center gap-2 px-4 text-sm font-medium", <><span className={`text-[10px] text-tal-plum-soft transition-transform ${s.open ? "rotate-90" : ""}`}>▶</span>Your progress · {doneCount} of 8 done</>)
  if (s.open) {
    ORDER.forEach((id, k) => {
      const dn = isDone(id), cur = id === s.step
      put(k === 0 ? "progressList" : null, { x: ix + 16, y: cy + 44 + 4 + k * 34, w: iw - 32, h: 28 }, "flex items-center gap-2.5 rounded-lg px-2 text-sm",
        <>
          <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${dn ? "bg-black text-white" : "bg-white text-tal-plum-soft ring-1 ring-tal-line"}`}>{dn ? "✓" : ""}</span>
          <span className={`truncate ${dn ? "text-tal-plum" : "text-tal-plum-soft"} ${cur ? "font-semibold" : ""}`}>{META[id].title}</span>
          {cur && <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-tal-plum-soft">You are here</span>}
        </>)
    })
    r.progressList = { x: ix + 16, y: cy + 48, w: iw - 32, h: 8 * 34 - 6 }
  }
  cy += 44 + listH + 24

  // Primary-style buttons
  const dark = "flex items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-medium text-white"
  const outline = "flex items-center justify-center gap-2 rounded-xl border border-tal-line bg-white px-5 text-sm font-medium text-tal-plum"
  const textBtn = "flex items-center text-sm text-tal-plum-soft"
  /** A flex-wrap gap-3 row of buttons (each 44 tall); returns the row's bottom. */
  const btnRow = (y0: number, items: { name: string; w: number; cls: string; node: ReactNode }[]) => {
    let bx = ix, by = y0
    for (const it of items) {
      const w = Math.min(iw, it.w)
      if (bx > ix && bx + w > ix + iw) { bx = ix; by += 44 + 12 }
      put(it.name, { x: bx, y: by, w, h: 44 }, it.cls, it.node)
      bx += w + 12
    }
    return by + 44
  }

  switch (s.step) {
    case "hello": {
      const pH = wrapLines(HELLO_P, iw, CB) * 26
      put("helloP", { x: ix, y: cy, w: iw, h: pH }, "leading-relaxed", HELLO_P)
      cy += pH + 16
      put("tour", { x: ix, y: cy, w: 196, h: 40 }, "flex items-center justify-center gap-2 rounded-lg border border-tal-line bg-white text-sm", <><ResetIcon />Take the tour again</>)
      cy += 40 + 20
      // HowItFitsTogether
      const fp = P ? 16 : 20
      const fx = ix + fp + 1, fw = iw - fp * 2 - 2
      const flowTop = cy
      const flowIdx = n.length
      n.push(null)
      let fy = cy + 1 + fp
      put(null, { x: fx, y: fy, w: fw, h: 16 }, "flex items-center justify-between text-[11px]", <><span className="font-semibold uppercase tracking-widest text-tal-plum-soft">How the pieces fit together</span><span className="inline-flex items-center gap-1 text-tal-plum-soft underline underline-offset-2"><ResetIcon size={12} />Watch again</span></>)
      fy += 16 + 12
      const nodeRects: Rect[] = []
      if (!P) {
        const sc = fw / 570, svgH = Math.round(120 * sc)
        n.push(
          <Box key={n.length} x={fx} y={fy} w={fw} h={svgH}>
            <svg viewBox="0 0 570 120" width={fw} height={svgH} aria-hidden>
              {[[90, 180], [240, 330], [390, 480]].map(([a, b]) => <line key={a} x1={a} y1={60} x2={b} y2={60} stroke="currentColor" strokeWidth="1.5" className="text-tal-line" />)}
              {[180, 330, 480].map((x) => <polyline key={x} points={`${x - 6},55 ${x},60 ${x - 6},65`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-tal-line" />)}
              {NODES.map((nd, i) => (
                <g key={nd.label}>
                  <circle cx={60 + i * 150} cy={60} r={30} fill={nd.color} />
                  <foreignObject x={60 + i * 150 - 12} y={48} width={24} height={24}><div className="flex h-full w-full items-center justify-center text-tal-plum">{nd.icon}</div></foreignObject>
                  <text x={60 + i * 150} y={108} textAnchor="middle" className="fill-tal-plum text-[10px] font-semibold">{nd.label}</text>
                </g>
              ))}
              <circle cx={210} cy={60} r={6} className="fill-tal-plum" />
            </svg>
          </Box>,
        )
        NODES.forEach((_, i) => nodeRects.push({ x: fx + (30 + i * 150) * sc, y: fy + 30 * sc, w: 60 * sc, h: 60 * sc }))
        fy += svgH + 8
        const fh = wrapLines(FLOW_FOOT, fw, CX) * 17
        put(null, { x: fx, y: fy, w: fw, h: fh }, "text-xs leading-snug text-tal-plum-soft",
          <>Tap any circle to learn more. <span className="font-medium text-tal-plum">Setup</span> fills your <span className="font-medium text-tal-plum">Organiser</span>. Your <span className="font-medium text-tal-plum">Planner</span> holds what matters most. You choose who to <span className="font-medium text-tal-plum">share</span> with.</>)
        fy += fh
      } else {
        NODES.forEach((nd, i) => {
          const rr = { x: fx - 8, y: fy, w: fw + 16, h: 56 }
          nodeRects.push(rr)
          put(null, rr, "flex items-center gap-3 rounded-xl p-2",
            <><span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${nd.chip}`}>{nd.icon}</span><div className="min-w-0 flex-1"><div className="text-sm font-medium leading-tight">{nd.label}</div><div className="text-xs leading-snug text-tal-plum-soft">{nd.body}</div></div><span className="shrink-0 text-[11px] text-tal-plum-soft">Learn →</span></>)
          fy += 56 + 8
          if (i < 3) { put(null, { x: fx + 12, y: fy, w: 12, h: 14 }, "text-tal-plum-soft", <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M6 1v11M2 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>); fy += 14 + 8 }
        })
        fy -= 8
      }
      const flow = { x: ix, y: flowTop, w: iw, h: fy + fp + 1 - flowTop }
      n[flowIdx] = <Box key="flow" {...flow} className="rounded-2xl border border-tal-line bg-white" />
      r.flow = flow
      nodeRects.forEach((nr, i) => { r[`node${i}`] = nr })
      cy = flow.y + flow.h + 20
      // Video placeholder
      const vh = Math.round((iw * 9) / 16)
      put("video", { x: ix, y: cy, w: iw, h: vh }, "flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-tal-cream-soft text-tal-plum-soft ring-1 ring-tal-line",
        <><VideoIcon /><div className="mt-2 text-sm font-medium">Walkthrough video</div><div className="text-xs">Coming soon — a quick tour of the app.</div></>)
      cy += vh + 24
      // Tiles
      const tw = P ? iw : (iw - 12) / 2
      const textW = tw - 32 - 64 - 12
      const tileH = TILES.map((t) => 32 + Math.max(64, wrapLines(t.title, textW, 9.4) * 20 + 4 + wrapLines(t.body, textW, CX) * 16.5))
      const tilesTop = cy
      TILES.forEach((t, i) => {
        const rowH = P ? tileH[i] : Math.max(tileH[i - (i % 2)], tileH[i - (i % 2) + 1])
        const tx = P ? ix : ix + (i % 2) * (tw + 12)
        put(`tile${i}`, { x: tx, y: cy, w: tw, h: rowH }, `rounded-2xl p-4 ring-1 ${t.accent}`,
          <div className="flex items-start gap-3"><Thumb src={t.image} size={64} className="rounded-xl ring-0" /><div className="min-w-0"><div className="font-display leading-tight">{t.title}</div><p className="mt-1 text-xs leading-snug text-tal-plum-soft">{t.body}</p></div></div>)
        if (P || i % 2 === 1) cy += rowH + 12
      })
      cy -= 12
      r.tiles = { x: ix, y: tilesTop, w: iw, h: cy - tilesTop }
      cy += 24
      const wH = wrapLines(WHERE, iw - 32, CS) * 20 + 26
      put("where", { x: ix, y: cy, w: iw, h: wH }, "rounded-xl border border-tal-line bg-tal-cream/70 px-4 py-3 text-sm leading-5",
        <><span className="font-medium">Where to start:</span> the Setup Guide. It walks you through everything, one bite-size step at a time. You can stop, save, and pick it up again whenever it suits.</>)
      cy += wH + 12
      const talH = 32 + 24 + 18 + 6 + wrapLines(TAL_P, iw - 32 - 52, CX) * 19.5
      put("tal", { x: ix, y: cy, w: iw, h: talH }, "flex items-start gap-3 rounded-xl bg-black p-4 text-white",
        <>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10"><TalAiIcon size={20} /></span>
          <div className="min-w-0">
            <div className="font-medium">Ask TAL AI — your built-in guide</div>
            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-white/60">TAL = <span className="normal-case tracking-normal">The Adulting Life</span></div>
            <p className="mt-1.5 text-xs leading-relaxed text-white/75">Anywhere in the app, tap <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 font-medium">Ask TAL AI</span> (top right) and ask anything — &ldquo;What goes in the Peace of Mind Planner?&rdquo;, &ldquo;How do I share my will with my partner?&rdquo;, &ldquo;What&apos;s a TFN?&rdquo; TAL walks you through every section, explains every field, and stays with you the whole way.</p>
          </div>
        </>)
      cy += talH + 32
      cy = btnRow(cy, [
        { name: "go", w: 178, cls: dark, node: <>Show me around<ArrowIcon /></> },
        { name: "skipHello", w: 190, cls: textBtn, node: "Skip and explore on my own" },
      ])
      break
    }
    case "welcome": {
      const tw = iw - 80
      const ph = wrapLines(WELCOME_P, tw, CS) * 20
      const h = Math.max(64, 24 + ph)
      put("hi", { x: ix, y: cy, w: iw, h }, "flex items-center gap-4",
        <><Avatar size={64} text="text-2xl" /><div><div className="font-medium">Hi Sarah 👋</div><p className="text-sm leading-5 text-tal-plum-soft">{WELCOME_P}</p></div></>)
      cy += h + 24
      const listTop = cy
      WELCOME_LIST.forEach((t, k) => {
        const lh = wrapLines(t, iw - 30, CS) * 20
        put(null, { x: ix, y: cy, w: iw, h: lh }, "flex gap-3 text-sm leading-5", <><span className="text-tal-plum-soft">{k + 1}.</span><span>{t}</span></>)
        cy += lh + 8
      })
      cy -= 8
      r.list = { x: ix, y: listTop, w: iw, h: cy - listTop }
      cy += 32
      cy = btnRow(cy, [{ name: "go", w: 124, cls: dark, node: "Let's go →" }])
      break
    }
    case "family": {
      const ph = wrapLines(FAMILY_P, iw, CB) * 26
      put("famP", { x: ix, y: cy, w: iw, h: ph }, "leading-relaxed", FAMILY_P)
      cy += ph + 24
      // FamilyUsersPanel
      const rightW = P ? 36 + 8 + 36 + 8 + 92 : 124 + 8 + 108 + 8 + 92
      const lw = iw - rightW - 8
      const headH = Math.max(36, 24 + 4 + wrapLines(PANEL_P, Math.min(lw, 672), CS) * 20)
      const panelTop = cy
      put("panelHead", { x: ix, y: cy, w: lw, h: headH }, "", <><h2 className="font-display leading-6">People in this family</h2><p className="mt-1 text-sm leading-5 text-tal-plum-soft">{PANEL_P}</p></>)
      let bx = ix + iw - rightW
      put("pdf", { x: bx, y: cy, w: P ? 36 : 124, h: 36 }, "flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm", <><PdfIcon />{!P && "Download PDF"}</>)
      bx += (P ? 36 : 124) + 8
      put("share", { x: bx, y: cy, w: P ? 36 : 108, h: 36 }, "flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm", <><MailIcon />{!P && "Share PDF"}</>)
      bx += (P ? 36 : 108) + 8
      put("addUser", { x: bx, y: cy, w: 92, h: 36 }, "flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white", "+ Add user")
      cy += headH + 12
      const usersTop = cy
      FAMILY.forEach((u) => {
        put(null, { x: ix, y: cy, w: iw, h: 68 }, "flex items-center justify-between rounded-xl border border-tal-line bg-white px-4",
          <><div className="min-w-0"><div className="truncate font-medium">{u.n}{u.primary && <span className="ml-2 rounded bg-tal-cream-soft px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">Primary login</span>}</div><div className="mt-0.5 truncate text-xs text-tal-plum-soft">{u.k}{u.e ? ` · ${u.e}` : ""}</div></div><span className="ml-3 shrink-0 text-tal-plum-soft">›</span></>)
        cy += 68 + 8
      })
      cy -= 8
      r.users = { x: ix, y: usersTop, w: iw, h: cy - usersTop }
      cy += 16
      if (!s.famAll) {
        const qh = wrapLines(PANEL_Q, iw - 32, CS) * 20
        const yesW = 176, noW = 132
        const wrapB = P && 16 + yesW + 8 + noW > iw - 16
        const h = 32 + qh + 8 + (wrapB ? 36 + 8 + 36 : 36)
        put("confirm", { x: ix, y: cy, w: iw, h }, "rounded-xl border border-tal-line bg-tal-cream-soft p-4 text-sm leading-5", PANEL_Q)
        put("yes", { x: ix + 16, y: cy + 16 + qh + 8, w: yesW, h: 36 }, "flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white", "Yes, everyone is added")
        put("no", wrapB ? { x: ix + 16, y: cy + 16 + qh + 8 + 44, w: noW, h: 36 } : { x: ix + 16 + yesW + 8, y: cy + 16 + qh + 8, w: noW, h: 36 }, "flex items-center justify-center rounded-xl border border-tal-line text-sm", "No, add another")
        cy += h
      } else {
        const textW = P ? iw - 32 : iw - 32 - 70
        const th = wrapLines(PANEL_DONE, textW, CS) * 20
        const oneRow = !P || th <= 20 && PANEL_DONE.length * CS + 12 + 56 <= iw - 32
        const h = oneRow ? 64 : 32 + th + 12 + 32
        put("undoBox", { x: ix, y: cy, w: iw, h }, "rounded-xl border border-green-100 bg-green-50/60")
        put(null, { x: ix + 16, y: oneRow ? cy + 22 : cy + 16, w: textW, h: th }, "text-sm leading-5", PANEL_DONE)
        put("undo", oneRow ? { x: ix + iw - 16 - 56, y: cy + 16, w: 56, h: 32 } : { x: ix + 16, y: cy + 16 + th + 12, w: 56, h: 32 }, "flex items-center justify-center rounded-xl text-sm", "Undo")
        cy += h
      }
      r.panel = { x: ix, y: panelTop, w: iw, h: cy - panelTop }
      cy += 32
      cy = btnRow(cy, [
        { name: "go", w: 124, cls: dark, node: "Continue →" },
        { name: "skipFor", w: 92, cls: textBtn, node: "Skip for now" },
      ])
      break
    }
    case "personal": case "health": case "education": case "employment": case "admin": {
      const cat = s.step as CatId
      const meta2 = INTROS[cat]
      const sum = summary(cat, !!s.ec)
      const ih = wrapLines(meta2.intro, iw, CB) * 26
      put("intro", { x: ix, y: cy, w: iw, h: ih }, "leading-relaxed", meta2.intro)
      cy += ih + 16
      const bTop = cy
      meta2.bullets.forEach((b) => {
        const bh = wrapLines(b, iw - 16, CS) * 20
        put(null, { x: ix, y: cy, w: iw, h: bh }, "flex gap-2 text-sm leading-5 text-tal-plum-soft", <><span className="text-tal-plum">•</span>{b}</>)
        cy += bh + 6
      })
      cy -= 6
      r.bullets = { x: ix, y: bTop, w: iw, h: cy - bTop }
      cy += 24
      // Folders in this section
      const counts = `${sum.completed} complete · ${sum.started} started · ${sum.total} total`
      const headWrap = P && 23 * 9.6 + 8 + counts.length * CX > iw
      const fhH = headWrap ? 24 + 8 + 16 : 24
      put("fhead", { x: ix, y: cy, w: iw, h: fhH }, `flex ${headWrap ? "flex-col gap-2" : "items-baseline justify-between gap-2"}`,
        <><h3 className="font-display leading-6">Folders in this section</h3><span className="text-xs leading-4 text-tal-plum-soft">{counts}</span></>)
      cy += fhH + 8 + 16
      // CategoryMatrix legend
      const lgH = P ? 76 : 18
      put("legend", { x: ix, y: cy, w: iw, h: lgH }, "flex flex-wrap items-center justify-between gap-3 text-xs leading-4 text-tal-plum-soft",
        <>
          <div className="inline-flex flex-wrap items-center gap-3">
            {(["done", "started", "empty"] as Cell[]).map((c) => <span key={c} className="inline-flex items-center gap-1"><span className={`inline-flex h-4 w-4 items-center justify-center rounded ${CELL[c].bg} ${CELL[c].c}`}>{CELL[c].s}</span>{c === "done" ? "complete" : c === "started" ? "in progress" : "empty"}</span>)}
            <span className="inline-flex items-center gap-1"><span className="inline-flex h-4 w-4 items-center justify-center">—</span>not applicable</span>
            <span className="inline-flex items-center gap-1"><span className="inline-flex h-4 w-4 items-center justify-center text-tal-plum"><PlannerShareIcon size={13} /></span>shareable in Planner</span>
          </div>
          <div className="font-medium text-tal-plum">{sum.total} folders in this section{sum.total > 8 && <span className="text-tal-plum-soft"> · scroll for more</span>}</div>
        </>)
      cy += lgH + 8
      cy = P ? phoneMatrix(sum.rows, ix, iw, cy, put, r) : deskMatrix(sum.rows, ix, iw, cy, put, r)
      cy += 32
      cy = btnRow(cy, [
        { name: "go", w: btnW(sum.go), cls: `${dark} text-left leading-5`, node: sum.go },
        { name: "enough", w: isDone(cat) ? 124 : 214, cls: outline, node: isDone(cat) ? "Continue →" : "I've done enough for now" },
        { name: "skipSec", w: 120, cls: textBtn, node: "Skip this section" },
      ])
      break
    }
    case "finish": {
      put("snap", { x: ix, y: cy, w: iw, h: 128 }, "rounded-2xl bg-tal-cream p-6",
        <>
          <div className="mb-1 flex items-center gap-2"><span>✨</span><span className="font-medium">You&apos;re doing great, Sarah!</span></div>
          <p className="mb-3 text-sm text-tal-plum-soft">You&apos;ve completed {PCT}% of your Organiser.</p>
          <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white"><div className="h-full bg-gradient-to-r from-violet-500 to-tal-plum" style={{ width: `${Math.max(PCT, 2)}%` }} /></div><span className="text-sm font-medium tabular-nums">{PCT}%</span></div>
        </>)
      cy += 128 + 24
      const fh = wrapLines(FINISH_P, iw, CB) * 26
      put("finP", { x: ix, y: cy, w: iw, h: fh }, "leading-relaxed", FINISH_P)
      cy += fh + 8
      put("left", { x: ix, y: cy, w: iw, h: 20 }, "text-sm text-tal-plum-soft", `${ALL_DONE} of ${ALL_FOLDERS} folders complete · ${ALL_FOLDERS - ALL_DONE} left to go.`)
      cy += 20 + 24
      // PushOptInCard
      if (s.push) {
        const ph = 34 + wrapLines("Notifications on. We'll let you know when something important is about to expire.", iw - 34, CS) * 20
        put("push", { x: ix, y: cy, w: iw, h: ph }, "rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-5 text-emerald-900",
          <><span className="font-medium">Notifications on.</span> We&apos;ll let you know when something important is about to expire.</>)
        cy += ph
      } else {
        const pp = P ? 16 : 20
        const th = wrapLines(PUSH_P, iw - pp * 2 - 2 - 52, CX) * 16
        const ph = pp * 2 + 2 + Math.max(40, 24 + 2 + th) + 16 + 44
        put("push", { x: ix, y: cy, w: iw, h: ph }, "rounded-2xl border border-tal-line bg-tal-cream-soft")
        put(null, { x: ix + pp + 1, y: cy + pp + 1, w: iw - pp * 2 - 2, h: Math.max(40, 26 + th) }, "flex items-start gap-3",
          <><span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white"><BellIcon /></span><div className="min-w-0 flex-1"><div className="font-medium leading-6">Get a heads-up before things expire?</div><p className="mt-0.5 text-xs leading-4 text-tal-plum-soft">{PUSH_P}</p></div></>)
        put("pushBtn", { x: ix + pp + 1, y: cy + ph - pp - 1 - 44, w: P ? iw - pp * 2 - 2 : 196, h: 44 }, "flex items-center justify-center rounded-lg bg-black text-sm font-medium text-white", "Turn on notifications")
        cy += ph
      }
      cy += 32
      cy = btnRow(cy, [
        { name: "dash", w: 136, cls: dark, node: <><HomeIcon />Dashboard</> },
        { name: "org", w: 136, cls: outline, node: <><FolderIcon />Organiser</> },
      ])
      break
    }
  }

  cy += v.pad
  const card = { x: cx, y: cardTop, w: cw, h: cy - cardTop }
  n[cardIdx] = <Box key="card" {...card} className="rounded-3xl bg-white shadow-sm ring-1 ring-tal-line" />
  r.card = card
  y = cy + 24
  put("back", { x: cx, y, w: 64, h: 20 }, `text-sm ${!isFinish && idx === 0 ? "text-tal-plum-soft/40" : "text-tal-plum-soft"}`, "← Back")
  if (!isFinish) put("skipStep", { x: cx + cw - 104, y, w: 104, h: 20 }, "text-right text-sm text-tal-plum-soft", "Skip this step")
  y += 20 + (P ? 24 : 40)
  const h = Math.max(v.H, y)

  // A How-the-pieces-fit circle's pop-up (NodeInfoDialog)
  if (s.node !== undefined) {
    const nd = NODES[s.node]
    const dw = Math.min(448, v.W - 32) - 48
    const what = wrapLines(nd.what, dw, CS) * 23, ex = wrapLines(nd.example, dw, CS) * 23
    const dh = 48 + 44 + 12 + what + 12 + ex + 20 + 36
    const d = centred(v, s.at ?? 0, 448, dh)
    n.push(<Box key="dim" x={0} y={0} w={v.W} h={h} className="bg-black/40" />)
    put("dialog", d, "rounded-2xl bg-white p-6 shadow-2xl",
      <>
        <div className="mb-3 flex items-start gap-3">
          <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${nd.chip}`}>{nd.icon}</span>
          <div className="min-w-0 flex-1"><div className="text-[10px] font-semibold uppercase tracking-widest text-tal-plum-soft">How the pieces fit</div><h3 className="font-display text-xl leading-tight">{nd.label}</h3></div>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-tal-plum-soft">✕</span>
        </div>
        <p className="text-sm leading-relaxed">{nd.what}</p>
        <p className="mt-3 text-sm italic leading-relaxed text-tal-plum-soft">{nd.example}</p>
      </>)
    const gw = nd.goto ? btnW(nd.goto, 16, 7.2) + 20 : 0
    put("gotIt", { x: d.x + d.w - 24 - gw - (gw ? 8 : 0) - 72, y: d.y + d.h - 24 - 36, w: 72, h: 36 }, "flex items-center justify-center rounded-lg border border-tal-line text-sm", "Got it")
    if (nd.goto) put("goto", { x: d.x + d.w - 24 - gw, y: d.y + d.h - 24 - 36, w: gw, h: 36 }, "flex items-center justify-center gap-1.5 rounded-lg bg-tal-plum text-sm font-medium text-white", <>{nd.goto}<span>›</span></>)
  }

  const el = (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      {P && <StatusBar />}
      {n}
    </div>
  )
  return { el, h, r }
}

type Put = (name: string | null, rect: Rect, cls: string, node?: ReactNode) => void

/** CategoryMatrix's desktop table (Setup Guide variant). Returns the bottom. */
function deskMatrix(rows: MRow[], x: number, w: number, y: number, put: Put, r: Record<string, Rect>) {
  // Folder is w-1/2, but the nowrap name columns need ~104px each, so it gives way.
  const plW = 80, uW = 104, fW = w - plW - uW * 4, headH = 62
  const nameAvail = fW - 32 - 24 - 8 - 28 - 8
  const rowH = rows.map((row) => {
    const nw = row.name.length * CS + (row.users ? 52 : 0)
    const why = WHY.has(row.id) ? 58 : 0
    if (nw + why <= nameAvail) return 44
    if (nw <= nameAvail) return 62
    return 24 + wrapLines(row.name, nameAvail, CS) * 20 + (why ? 18 : 0)
  })
  const total = headH + rowH.reduce((a, b) => a + b, 0) + 2
  const table = { x, y, w, h: total }
  put("table", table, "overflow-hidden rounded-2xl border border-tal-line bg-white text-sm")
  put(null, { x: x + 1, y: y + 1, w: w - 2, h: headH }, "border-b border-tal-line bg-tal-cream-soft")
  put("thFolder", { x: x + 1, y: y + 1, w: fW, h: headH }, "flex items-center px-4 font-medium text-tal-plum-soft", "Folder")
  put("thPlanner", { x: x + fW, y: y + 1, w: plW, h: headH }, "flex flex-col items-center justify-center text-center font-medium", <><div>Planner</div><div className="mt-0.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">shareable</div></>)
  PEOPLE.forEach((p, k) => put(`th${k}`, { x: x + fW + plW + k * uW, y: y + 1, w: uW, h: headH }, "flex flex-col items-center justify-center whitespace-nowrap text-center font-medium",
    <><div className="max-w-full truncate px-1">{p.short}</div><div className="mt-0.5 text-[10px] uppercase tracking-widest text-tal-plum-soft">{p.k}</div></>))
  let ry = y + 1 + headH
  rows.forEach((row, i) => {
    const h = rowH[i]
    const why = WHY.has(row.id)
    if (i > 0) put(null, { x: x + 1, y: ry, w: w - 2, h: 1 }, "bg-tal-line")
    r[`row:${row.id}`] = { x: x + 1, y: ry, w: w - 2, h }
    put(`name:${row.id}`, { x: x + 1 + 16, y: ry, w: fW - 32, h }, "flex flex-wrap content-center items-center gap-x-2 gap-y-0.5",
      <>
        <span className="flex items-center gap-2"><span className="w-6 shrink-0 text-right text-xs tabular-nums text-tal-plum-soft">{i + 1}.</span><Thumb src={thumbOf(row.id)} size={28} /><span className="leading-5">{row.name}</span>{row.users && <span className="ml-1 shrink-0 text-[10px] uppercase tracking-widest text-tal-plum-soft">· users</span>}</span>
        {why && <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-tal-plum-soft"><WhyIcon />Why?</span>}
      </>)
    if (why) {
      const nw = row.name.length * CS + (row.users ? 52 : 0)
      const inline = nw + 58 <= nameAvail
      r[`why:${row.id}`] = inline
        ? { x: x + 17 + 24 + 8 + 28 + 8 + row.name.length * 6.45 + (row.users ? 52 : 0) + 8, y: ry + (h - 18) / 2, w: 50, h: 18 }
        : { x: x + 17, y: ry + h - 12 - 18, w: 50, h: 18 }
    }
    if (row.planner) put(null, { x: x + fW, y: ry, w: plW, h }, "flex items-center justify-center", <PlannerShareIcon />)
    if (row.fam) {
      const c = CELL[row.fam]
      put(`cell:${row.id}:fam`, { x: x + fW + plW, y: ry, w: uW * 4 - 1, h }, `flex items-center justify-center gap-2 ${c.bg}`,
        <><span className={c.c}>{c.s}</span><span className="text-[10px] font-medium uppercase tracking-widest text-tal-plum-soft">· shared with family</span></>)
    } else {
      (row.cells ?? []).forEach((cell, k) => {
        const c = CELL[cell]
        put(`cell:${row.id}:${k}`, { x: x + fW + plW + k * uW, y: ry, w: k === 3 ? uW - 1 : uW, h }, `flex items-center justify-center ${c.bg}`, <span className={c.c}>{c.s}</span>)
      })
    }
    ry += h
  })
  return y + total
}

/** CategoryMatrix's MobileMatrix: rotated names, each folder on two lines. Returns the bottom. */
function phoneMatrix(rows: MRow[], x: number, w: number, y: number, put: Put, r: Record<string, Rect>) {
  const headH = 140
  const nameAvail = w - 16 - 16 - 8 - 24 - 8
  const rowInfo = rows.map((row) => {
    const plan = row.planner ? 21 : 0
    const users = row.users ? 52 : 0
    const why = WHY.has(row.id) ? 44 : 0
    const nw = row.name.length * CS
    let line: number
    if (nw + plan + users + why <= nameAvail) line = 24
    else if (nw + plan + users <= nameAvail) line = 24 + 4 + 16
    else line = wrapLines(row.name, nameAvail - plan - users, CS) * 20 + (why ? 20 : 4)
    return { line, h: 8 + line + 6 + 32 + 8 }
  })
  const total = headH + rowInfo.reduce((a, b) => a + b.h + 1, 0) + 1
  const box = { x, y, w, h: total }
  put("table", box, "overflow-hidden rounded-2xl border border-tal-line bg-white")
  put(null, { x: x + 1, y: y + 1, w: w - 2, h: headH }, "border-b border-tal-line bg-tal-cream-soft")
  const gx = x + 1 + 4, gw = w - 2 - 8, colW = gw / 4
  PEOPLE.forEach((p, k) => put(`th${k}`, { x: gx + k * colW, y: y + 1 + 12, w: colW, h: headH - 20 }, "flex items-end justify-center",
    <div className="truncate px-1 text-xs font-medium leading-none" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", maxHeight: 128 }}>{p.short}{k === 0 && <span className="ml-1 text-tal-plum-soft">★</span>}</div>))
  let ry = y + 1 + headH
  const cx0 = x + 1 + 8 + 4, cw = (w - 2 - 16 - 8 - 6) / 4
  rows.forEach((row, i) => {
    const { line, h } = rowInfo[i]
    const why = WHY.has(row.id)
    if (i > 0) put(null, { x: x + 1, y: ry, w: w - 2, h: 1 }, "bg-tal-line")
    const top = ry + (i > 0 ? 1 : 0)
    r[`row:${row.id}`] = { x: x + 1, y: top, w: w - 2, h }
    put(`name:${row.id}`, { x: x + 1 + 8, y: top + 8, w: w - 2 - 16, h: line }, "flex flex-wrap content-center items-center gap-x-2 gap-y-1 text-sm",
      <>
        <span className="flex items-center gap-2"><span className="shrink-0 text-xs tabular-nums text-tal-plum-soft">{i + 1}.</span><Thumb src={thumbOf(row.id)} size={24} /><span className="min-w-0 leading-5">{row.name}</span>{row.users && <span className="ml-1 shrink-0 text-[9px] uppercase tracking-widest text-tal-plum-soft">· users</span>}{row.planner && <span className="ml-1 inline-flex shrink-0"><PlannerShareIcon size={13} /></span>}</span>
        {why && <span className="text-[10px] uppercase tracking-widest text-tal-plum-soft">Why?</span>}
      </>)
    if (why) {
      const nw = row.name.length * 6.45 + (row.planner ? 21 : 0) + (row.users ? 52 : 0)
      r[`why:${row.id}`] = line === 24
        ? { x: x + 9 + 16 + 8 + 24 + 8 + nw + 6, y: top + 8 + 3, w: 38, h: 18 }
        : { x: x + 9, y: top + 8 + line - 18, w: 38, h: 18 }
    }
    const cy = top + 8 + line + 6
    if (row.fam) {
      const c = CELL[row.fam]
      put(`cell:${row.id}:fam`, { x: x + 9, y: cy, w: w - 18, h: 32 }, `flex items-center justify-center gap-2 rounded-md ${c.bg}`,
        <><span className={c.c}>{c.s}</span><span className="text-[9px] font-medium uppercase tracking-widest text-tal-plum-soft">· family</span></>)
    } else {
      (row.cells ?? []).forEach((cell, k) => {
        const c = CELL[cell]
        put(`cell:${row.id}:${k}`, { x: cx0 + k * (cw + 2), y: cy, w: cw, h: 32 }, `flex items-center justify-center rounded-md ${c.bg}`, <span className={c.c}>{c.s}</span>)
      })
    }
    ry = top + h
  })
  return y + total
}

// ── The banner every from=setup page shows (SetupReturnBanner) ──────────────

function setupBanner(v: V, y: number, next: boolean, put: Put) {
  const P = v.phone
  const x = P ? 8 : 32, w = P ? 374 : 1136
  const retW = 222, nextW = 132
  const left = <><span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15"><BannerIcon /></span><div className="min-w-0"><div className="text-sm font-medium leading-5">You&apos;re in the Setup Guide</div><div className="text-xs leading-4 text-white/70">Fill this in, then head back or move to the next form.</div></div></>
  const retNode = <><span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-tal-plum/10"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg></span>Return to Setup Guide</>
  const nextNode = <>Next form<span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-tal-plum/10"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg></span></>
  const retCls = "flex items-center gap-2 rounded-xl bg-white pl-2 pr-4 text-sm font-semibold text-tal-plum shadow-sm"
  const nextCls = "flex items-center justify-end gap-2 rounded-xl bg-tal-cream pl-4 pr-2 text-sm font-semibold text-tal-plum shadow-sm"
  let h: number
  if (!P) {
    h = 68
    put("banner", { x, y, w, h }, "rounded-2xl border border-tal-plum/20 bg-tal-plum text-white shadow-sm")
    put(null, { x: x + 16, y: y + 16, w: 500, h: 36 }, "flex items-center gap-3 text-white", left)
    const rx = x + w - 16 - (next ? nextW + 12 : 0) - retW
    put("ret", { x: rx, y: y + 12, w: retW, h: 44 }, retCls, retNode)
    if (next) put("next", { x: rx + retW + 12, y: y + 12, w: nextW, h: 44 }, nextCls, nextNode)
  } else {
    h = next ? 172 : 116
    put("banner", { x, y, w, h }, "rounded-2xl border border-tal-plum/20 bg-tal-plum text-white shadow-sm")
    put(null, { x: x + 16, y: y + 12, w: w - 32, h: 36 }, "flex items-center gap-3 text-white", left)
    put("ret", { x: x + 16, y: y + 60, w: retW, h: 44 }, retCls, retNode)
    if (next) put("next", { x: x + 16, y: y + 116, w: nextW, h: 44 }, nextCls, nextNode)
  }
  return y + h
}

// ── A folder from the guide (records/personal/personal.emergency_contacts) ───
// The folder's real page_questions (label, type, col_start / col_span /
// row_order, required, hint) laid out like PageForm's 12-column grid (every
// field full width on a phone). Sarah's entry is half done - no phone number.

type FT = "text" | "textarea" | "dropdown" | "address"
type FF = { l: string; t: FT; r: number; c?: number; s?: number; req?: boolean; hint?: string; v?: string; typed?: boolean }
const EC_NAME = "Emergency Contacts"
const EC_HINT = "The people to call in an emergency — start with your top one or two."
const EC_DESC = "The people who need to know first if something happens — your named next-of-kin and immediate emergency contacts. For every family member. Fill it in so anyone opening your organiser in a crisis can call the right people straight away."
const EC_NOTE = "Add a private note for your family — reminders, where the physical document lives, who to call."
const EC_PHONE = "0423 555 274"
const EC_FIELDS: FF[] = [
  { l: "Full Name", t: "text", r: 1, req: true, v: "Emma Clarke" },
  { l: "Relationship", t: "text", r: 2, s: 6, hint: "e.g. spouse, parent, sibling, friend", v: "Sister" },
  { l: "Priority", t: "dropdown", r: 2, c: 7, s: 6, v: "Primary" },
  { l: "Phone Number", t: "text", r: 3, s: 6, req: true, typed: true },
  { l: "Alternate Phone", t: "text", r: 3, c: 7, s: 6 },
  { l: "Email Address", t: "text", r: 4, v: "emma.clarke@example.com" },
  { l: "Address", t: "address", r: 5, v: "8 Wattle Close, Paddington QLD 4064" },
  { l: "Notes", t: "textarea", r: 6, hint: "Anything a paramedic or hospital should know — best time to call, spoken languages, etc.", v: "Has a spare house key. Best on her mobile after 3pm." },
]
const ctrlH = (f: FF) => (f.t === "textarea" ? 84 : 44)
const fieldH = (f: FF, w: number) => wrapLines(f.l + (f.req ? "*" : ""), w, 7.6) * 16 + 4 + ctrlH(f) + (f.hint ? 4 + wrapLines(f.hint, w, CX) * 16 : 0)

function folderPage(v: V, phase: "typing" | "filled"): Built {
  const P = v.phone
  const r: Record<string, Rect> = {}
  const n: ReactNode[] = []
  const put: Put = (name, rect, cls, node) => { if (name) r[name] = rect; n.push(<Box key={n.length} {...rect} className={cls}>{node}</Box>) }
  const x = P ? 8 : 32, w = P ? 374 : 1136
  let y = setupBanner(v, P ? 116 : 72, true, put) + 16
  // Breadcrumb + UserPicker
  put("crumbs", { x, y: P ? y : y + 6, w: P ? w : 300, h: 22 }, "flex items-center gap-2 whitespace-nowrap text-sm text-tal-plum-soft", <><span>The Adulting Life Organiser</span><span className="opacity-50">·</span><span>Personal</span><span className="opacity-50">·</span></>)
  const picker = P ? { x, y: y + 28, w: 150, h: 34 } : { x: x + 316, y, w: 150, h: 34 }
  put("picker", picker, "flex items-center gap-2 rounded-full border-2 border-tal-plum/40 bg-white pl-2 pr-3 text-sm font-semibold shadow-sm", <><span className="flex h-6 w-6 items-center justify-center rounded-full bg-tal-plum/10 text-xs">👤</span><span className="flex-1 truncate">Sarah Taylor</span><span className="text-xs">▾</span></>)
  put(null, { x: picker.x + picker.w + 10, y: picker.y + 8, w: 170, h: 18 }, "text-xs italic text-tal-plum-soft", "click to switch person")
  y = picker.y + 34 + 12
  // Header
  const headH = P ? 12 + 48 + 12 + 36 + 12 : 72
  put("head", { x, y, w, h: headH }, "rounded-2xl bg-black shadow-md")
  n.push(<Img key="ecthumb" src={thumbOf("personal.emergency_contacts")} x={x + (P ? 12 : 20)} y={y + 12} w={48} className="rounded-xl bg-white ring-2 ring-white/20" />)
  put(null, { x: x + (P ? 76 : 84), y: y + 12, w: P ? w - 88 : 700, h: 48 }, "flex flex-col justify-center text-white", <><p className="font-display leading-tight" style={{ fontSize: P ? 20 : 24 }}>{EC_NAME}</p><p className="mt-0.5 truncate text-xs text-white/70">{EC_HINT}</p></>)
  put(null, P ? { x: x + 12, y: y + 72, w: 150, h: 36 } : { x: x + w - 170, y: y + 18, w: 150, h: 36 }, "flex", <span className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-white px-3 text-sm font-medium text-tal-plum"><ExcelIcon />Export to Excel</span>)
  y += headH + 24
  // Description
  const dh = 32 + wrapLines(EC_DESC, w - 32 - 44, CS) * 23
  put("desc", { x, y, w, h: dh }, "flex items-start gap-3 rounded-2xl border border-tal-line bg-tal-cream-soft/60 p-4 text-sm leading-relaxed", <><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tal-plum/10"><InfoIcon /></span>{EC_DESC}</>)
  y += dh + 24
  // FolderNotes
  const nh = 20 + 28 + 8 + wrapLines(EC_NOTE, w - 40, CS) * 20 + 20
  put("notes", { x, y, w, h: nh }, "rounded-2xl border border-tal-line bg-amber-50/40 p-5",
    <><div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2"><span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H16l4 4v10.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-13Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M15 4v5h5" stroke="currentColor" strokeWidth="1.7" /></svg></span><span className="font-display text-lg">Notes</span></span><span className="text-xs text-tal-plum-soft underline">Add note</span></div><p className="text-sm leading-5 text-tal-plum-soft">{EC_NOTE}</p></>)
  y += nh + 24
  const pdfB = "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"
  put(null, { x, y, w, h: 36 }, "flex items-center justify-end gap-2", <><span className={`${pdfB} ${P ? "w-9" : "px-3"}`}><PdfIcon />{!P && "Download PDF"}</span><span className={`${pdfB} ${P ? "w-9" : "px-3"}`}><MailIcon />{!P && "Share PDF"}</span></>)
  y += 36 + 24
  // The entry card
  const cardTop = y
  const cardIdx = n.length
  n.push(null)
  put(null, { x: x + 16, y: y + 16, w: w - 32, h: 36 }, "flex items-center justify-between gap-2",
    <><span className="text-xs uppercase tracking-wider text-tal-plum-soft">Entry 1</span><span className="flex shrink-0 items-center gap-2">{!P && <><span className={`${pdfB} px-3`}><PdfIcon />Download PDF</span><span className={`${pdfB} px-3`}><MailIcon />Share PDF</span></>}<span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-tal-line bg-white text-red-700">🗑</span></span></>)
  y += 16 + 36 + 12
  const fx = x + 16, fw = w - 32
  const col = (fw - 11 * 16) / 12
  const rowsIx = [...new Set(EC_FIELDS.map((f) => f.r))]
  for (const row of rowsIx) {
    let rowH = 0
    const fs = EC_FIELDS.filter((f) => f.r === row)
    const placed = fs.map((f, k) => {
      const sp = P ? 12 : f.s ?? 12
      const ww = P ? fw : sp * col + (sp - 1) * 16
      const h = fieldH(f, ww)
      const rr = P ? { x: fx, y: y + fs.slice(0, k).reduce((a, g) => a + fieldH(g, fw) + 16, 0), w: fw, h } : { x: fx + ((f.c ?? 1) - 1) * (col + 16), y, w: ww, h }
      rowH = P ? rowH + h + (k ? 16 : 0) : Math.max(rowH, h)
      return { f, rr }
    })
    for (const { f, rr } of placed) {
      const box = "flex h-11 items-center rounded-xl border border-tal-line bg-white px-3 text-sm"
      const val = f.typed ? (phase === "typing" ? <Typed text={EC_PHONE} delay={900} speed={110} /> : EC_PHONE) : f.v
      put(f.typed ? "phone" : null, rr, "",
        <>
          <p className="mb-1 text-xs uppercase leading-4 tracking-wider text-tal-plum-soft">{f.l}{f.req && <span className="text-red-500">*</span>}</p>
          {f.t === "textarea"
            ? <div className="h-[84px] rounded-xl border border-tal-line bg-white p-3 text-sm leading-5">{val}</div>
            : <div className={`${box} ${f.typed && phase === "typing" ? "border-tal-plum/40 ring-2 ring-tal-plum/30" : ""} ${f.t === "dropdown" ? "justify-between" : ""}`}><span className="truncate">{val}</span>{f.t === "dropdown" && <span className="pl-1 text-xs text-tal-plum-soft">▾</span>}</div>}
          {f.hint && <p className="mt-1 text-xs leading-4 text-tal-plum-soft">{f.hint}</p>}
        </>)
    }
    y += rowH + 16
  }
  y -= 16
  r.form = { x: fx, y: cardTop + 64, w: fw, h: y - cardTop - 64 }
  put("save", { x: fx, y: y + 16, w: 80, h: 40 }, "flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white", "Save")
  y += 16 + 40 + 16
  const card = { x, y: cardTop, w, h: y - cardTop }
  n[cardIdx] = <Box key="eccard" {...card} className="rounded-2xl border border-tal-line bg-white" />
  r.card = card
  y += 24
  put("add", { x, y, w: 132, h: 40 }, "flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm font-medium", "+ Add another")
  y += 40 + 48
  const h = Math.max(v.H, y)
  return { el: <AppShell v={v} h={h} side={false}>{n}</AppShell>, h, r }
}

// ── A Why? link (learn/personal/article/course-personal-birth-certificates) ──

const ART_TITLE = "Birth Certificate"
const ART_SUMMARY = "Your birth certificate is a document that proves your name and when & where you were born."
const ART_BODY = [
  "Your birth certificate is a document that proves your name and when & where you were born. It’s super important because it’s often the first thing you’ll need when you apply for important stuff like a passport, school enrolment, or even a driver’s licence. It’s basically your official ID from the day you were born.",
  "Parents apply for their child's birth certificate after the birth is registered. The process for registering a birth and obtaining a birth certificate is straightforward, but it can vary slightly depending on the state or territory.",
  "In Australia, all births must be registered with the state’s or territory’s Registry of Births, Deaths, and Marriages within 60 days of the child's birth. Usually, hospitals provide parents with the necessary forms, or you can complete the registration online through the relevant state or territory's registry office website.",
]
function articlePage(v: V): Built {
  const P = v.phone
  const r: Record<string, Rect> = {}
  const n: ReactNode[] = []
  const put: Put = (name, rect, cls, node) => { if (name) r[name] = rect; n.push(<Box key={n.length} {...rect} className={cls}>{node}</Box>) }
  const x = P ? 8 : 32, w = P ? 374 : 760
  let y = setupBanner(v, P ? 116 : 72, false, put) + 16
  put("crumbs", { x, y, w, h: 20 }, "flex items-center gap-2 text-sm text-tal-plum-soft", <><span>Learn</span><span className="text-tal-plum-soft/50">/</span><span>Personal</span></>)
  y += 32
  const hh = P ? 104 : 112
  put("hdr", { x, y, w, h: hh }, "flex items-center gap-4 rounded-2xl bg-black px-6 py-4 text-white shadow-md",
    <><Thumb src={thumbOf("personal.birth_certificates")} size={P ? 64 : 80} className="rounded-xl ring-2 ring-white/20" /><div className="min-w-0 flex-1"><p className="truncate font-display text-2xl leading-tight">{ART_TITLE}</p><p className="mt-1 truncate text-sm text-white/70">{ART_SUMMARY}</p><span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/90">1 min read</span></div></>)
  y += hh + 24
  const tw = w - (P ? 48 : 64) - 2
  const bh = (P ? 48 : 64) + ART_BODY.reduce((a, p) => a + wrapLines(p, tw, 7.3) * 26, 0) + (ART_BODY.length - 1) * 16 + 2
  put("body", { x, y, w, h: bh }, `space-y-4 overflow-hidden rounded-2xl border border-tal-line bg-white leading-relaxed shadow-sm ${P ? "p-6" : "p-8"}`, ART_BODY.map((p, i) => <p key={i}>{p}</p>))
  y += bh + 40
  const h = Math.max(v.H, y)
  return { el: <AppShell v={v} h={h} side={false}>{n}</AppShell>, h, r }
}

// ── The dashboard (app/(app)/dashboard - WizardResumeCard + ProgressCard) ────

const DASH_STATS = [
  { label: "Records & Documents", sub: "Stored securely", v: ALL_DONE, bg: "bg-violet-50 ring-violet-100", img: "records-documents" },
  { label: "Things expiring soon", sub: "View reminders", v: 2, bg: "bg-amber-50 ring-amber-100", img: "expiring-soon" },
  { label: "Tasks to complete", sub: "Keep it up!", v: 4, bg: "bg-sky-50 ring-sky-100", img: "tasks" },
  { label: "All good", sub: "No overdue items", v: 18, bg: "bg-emerald-50 ring-emerald-100", img: "all-good" },
]
const DASH_REMINDERS = [
  { t: "Toyota RAV4 registration", d: "Due in 12 days · 3 Dec 2026" },
  { t: "Home & contents insurance", d: "Due in 24 days · 15 Dec 2026" },
]
const DASH_SUMMARY = "2 reminders are coming up and 4 tasks are waiting."
function dashboard(v: V, doneCount: number, fabs: boolean): Built {
  const P = v.phone
  const r: Record<string, Rect> = {}
  const L = 272, LW = 586, HALF = 285, R2 = L + HALF + 16, AX = 890, AW = 278
  const pct = Math.round((doneCount / 8) * 100)
  const D = P
    ? { hero: { x: 8, y: 116, w: 374, h: 100 }, sos: { x: 8, y: 232, w: 374, h: 104 }, banner: { x: 8, y: 368, w: 374, h: 94 }, wizard: { x: 8, y: 494, w: 374, h: 92 }, progress: { x: 8, y: 602, w: 374, h: 96 } }
    : { hero: { x: L, y: 84, w: HALF, h: 100 }, sos: { x: R2, y: 72, w: HALF, h: 124 }, banner: { x: L, y: 228, w: LW, h: 146 }, wizard: { x: L, y: 406, w: 385, h: 104 }, progress: { x: L + 401, y: 406, w: 185, h: 104 } }
  r.wizard = D.wizard
  r.progress = D.progress
  const fab = FAB(v)
  const el = (
    <AppShell v={v} h={v.H}>
      <Box {...D.hero} className="py-2"><p className="font-display text-3xl leading-tight">Hi Sarah.</p><p className="mt-1 text-tal-plum-soft">{DASH_SUMMARY}</p></Box>
      <Box {...D.sos} className="rounded-2xl bg-red-600 p-4 text-white shadow-md">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">{ICONS.emergency}</span><div className="min-w-0 flex-1"><p className="mb-0.5 text-[10px] font-medium uppercase tracking-widest text-white/80">In case of emergency</p><p className="font-medium leading-snug">Your emergency information</p><p className="mt-1 text-xs text-white/85">Contacts, medications, insurance and will, on one page ready when it&apos;s needed.</p></div></div>
      </Box>
      <Img src="/thumbnails/banners/dashboard.jpg" x={D.banner.x} y={D.banner.y} w={D.banner.w} h={D.banner.h} className="rounded-2xl border border-tal-line" />
      <Box {...D.wizard} className="flex items-center gap-4 rounded-2xl bg-black p-5 text-white shadow-sm">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><ArrowIcon size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug"><span className="mr-2 text-[10px] font-medium uppercase tracking-widest text-white/80">Setup guide</span>You&apos;re {doneCount} of 8 steps in</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-white" style={{ width: `${pct}%` }} /></div>
        </div>
        <span className="shrink-0 text-white/90">→</span>
      </Box>
      <Box {...D.progress} className="flex flex-col justify-center rounded-2xl bg-tal-cream-soft p-5">
        <p className="mb-0.5 flex items-center gap-2 text-sm font-medium"><span>✨</span>You&apos;re doing great!</p>
        <p className="mb-2 text-xs text-tal-plum-soft">You&apos;ve completed {PCT}% of your Organiser</p>
        <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-tal-cream"><div className="h-full bg-violet-500" style={{ width: `${Math.max(PCT, 2)}%` }} /></div><span className="text-xs font-medium tabular-nums">{PCT}%</span></div>
      </Box>
      {DASH_STATS.map((s, k) => {
        const rr = P ? { x: 8, y: 730 + k * 96, w: 374, h: 80 } : { x: L + k * 150, y: 542, w: 134, h: 172 }
        return (
          <Box key={s.label} {...rr} className={`rounded-2xl ring-1 ${s.bg} ${P ? "flex items-center gap-3 p-4" : "p-5"}`}>
            {P ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/thumbnails/dashboard/${s.img}.webp`} alt="" className="h-12 w-12 shrink-0 rounded-2xl bg-white object-cover ring-1 ring-white" />
                <div className="min-w-0 flex-1"><p className="font-medium leading-tight">{s.label}</p><p className="mt-0.5 text-xs text-tal-plum-soft">{s.sub}</p></div>
                <span className="font-display text-2xl tabular-nums">{s.v}</span>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/thumbnails/dashboard/${s.img}.webp`} alt="" className="h-14 w-14 shrink-0 rounded-2xl bg-white object-cover ring-1 ring-white" />
                  <span className="font-display text-2xl leading-none tabular-nums">{s.v}</span>
                </div>
                <p className="mt-4 font-medium leading-tight">{s.label}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-tal-plum-soft"><span>{s.sub}</span><span>→</span></div>
              </>
            )}
          </Box>
        )
      })}
      {!P && (
        <>
          <Box x={AX} y={72} w={AW} h={256} className="rounded-2xl border border-amber-200 bg-amber-50/60" />
          <Box x={AX + 24} y={94} w={AW - 48} h={52}><p className="font-display text-xl leading-tight">Upcoming reminders</p><p className="mt-1 text-sm text-tal-plum-soft">View all 2 (in next 60 days) →</p></Box>
          {DASH_REMINDERS.map((rm, k) => (
            <Box key={rm.t} x={AX + 24} y={160 + k * 76} w={AW - 48} h={68} className="rounded-xl border border-tal-line bg-white p-3">
              <p className="font-medium">{rm.t}</p>
              <div className="mt-1 flex items-center justify-between gap-3"><span className="text-xs text-tal-plum-soft">{rm.d}</span><span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Soon</span></div>
            </Box>
          ))}
        </>
      )}
      {fabs && <Fabs y={fab.y} right={fab.right} />}
    </AppShell>
  )
  return { el, h: v.H, r }
}

// ── Screens and steps (shared by both versions) ──────────────────────────────

const BASE = "app.theadultinglife.com.au"
const U = {
  w: (step?: Sid) => `${BASE}/welcome${step ? `?step=${step}` : ""}`,
  ec: `${BASE}/records/personal/personal.emergency_contacts?from=setup&step=personal&next=personal.family_members`,
  art: `${BASE}/learn/personal/article/course-personal-birth-certificates?from=setup&step=personal`,
  dash: `${BASE}/dashboard`,
}

function build(v: V): { screens: Record<string, ReactNode>; steps: WalkStep[] } {
  const P = v.phone
  const sc = (h: number, y: number) => Math.max(0, Math.min(h - v.H, Math.round(y - v.H * 0.4)))
  const fz = (rr: Rect, s: number) => ({ x: P ? 195 : rr.x + rr.w / 2, y: rr.y + rr.h / 2, scale: P ? Math.min(s, 1.06) : s })
  const fzs = (rr: Rect, s: number) => ({ x: rr.x + rr.w / 2, y: rr.y + rr.h / 2, scale: s })
  const dlg = (b: Built) => ({ x: P ? 195 : 600, y: b.r.dialog.y + b.r.dialog.h / 2, scale: P ? 1.04 : 1.35 })

  // The story: Sarah has already added James, Mia and Leo, so Family is ticked
  // before she starts (page.tsx auto-detects it). She goes through every step,
  // skips Education, and comes back to it from the dashboard.
  const D0: Sid[] = ["family"]
  const D1: Sid[] = ["family", "hello"]
  const D2: Sid[] = [...D1, "welcome"]
  const D3: Sid[] = [...D2, "personal"]
  const D4: Sid[] = [...D3, "health"]
  const D5: Sid[] = [...D4, "employment"]
  const D6: Sid[] = [...D5, "admin"]

  const hello = wizard(v, { step: "hello", done: D0 })
  const helloOpen = wizard(v, { step: "hello", done: D0, open: true })
  const atFlow = sc(hello.h, hello.r.flow.y + hello.r.flow.h / 2)
  const nodeB = NODES.map((_, i) => wizard(v, { step: "hello", done: D0, node: i, at: atFlow }))
  const welcome = wizard(v, { step: "welcome", done: D1 })
  const family = wizard(v, { step: "family", done: D2 })
  const familyAll = wizard(v, { step: "family", done: D2, famAll: true })
  const personal = wizard(v, { step: "personal", done: D2 })
  const personalEc = wizard(v, { step: "personal", done: D2, ec: true })
  const personalDone = wizard(v, { step: "personal", done: D3, ec: true })
  const health = wizard(v, { step: "health", done: D3 })
  const healthDone = wizard(v, { step: "health", done: D4 })
  const education = wizard(v, { step: "education", done: D4 })
  const employment = wizard(v, { step: "employment", done: D4 })
  const admin = wizard(v, { step: "admin", done: D5 })
  const finish = wizard(v, { step: "finish", done: D6 })
  const finishPush = wizard(v, { step: "finish", done: D6, push: true })
  const back = wizard(v, { step: "education", done: D6 })
  const ec = folderPage(v, "typing")
  const ecDone = folderPage(v, "filled")
  const art = articlePage(v)
  const dash = dashboard(v, D6.length, false)
  const dashFabs = dashboard(v, D6.length, true)
  const fab = FAB(v)

  const screens: Record<string, ReactNode> = {
    hello: hello.el, helloOpen: helloOpen.el,
    node0: nodeB[0].el, node1: nodeB[1].el, node2: nodeB[2].el, node3: nodeB[3].el,
    welcome: welcome.el, family: family.el, familyAll: familyAll.el,
    personal: personal.el, art: art.el, ec: ec.el, ecDone: ecDone.el, personalEc: personalEc.el, personalDone: personalDone.el,
    health: health.el, healthDone: healthDone.el, education: education.el, employment: employment.el, admin: admin.el,
    finish: finish.el, finishPush: finishPush.el, dash: dash.el, back: back.el, dashFabs: dashFabs.el,
  }

  const R = (b: Built, k: string) => b.r[k]
  const sF = (b: Built, k: string) => sc(b.h, b.r[k].y + b.r[k].h / 2)
  const btnFocus = (b: Built, k: string, s = 1.5) => fzs(pad(b.r[k], P ? 60 : 120), P ? Math.min(s, 1.4) : s)
  const why = "personal.birth_certificates"
  const ecRow = "personal.emergency_contacts"

  const steps: WalkStep[] = [
    // Hello
    { screen: "hello", url: U.w("hello"), caption: "Welcome to The Adulting Life", detail: "The Setup guide opens by itself the first time you sign in. It has its own page - no menu - so it's just you and the next step.", focus: fz(span(R(hello, "label"), R(hello, "sub")), 1.3), ring: pad(span(R(hello, "label"), R(hello, "sub")), 6), duration: 7000 },
    { screen: "hello", url: U.w("hello"), caption: "Exit to Dashboard", detail: "Leave any time, top right. Your progress is saved - nothing is lost.", focus: P ? { x: 270, y: R(hello, "exit").y + 18, scale: 1.5 } : fzs(pad(R(hello, "exit"), 80), 1.8), ring: pad(R(hello, "exit"), 3), duration: 5500 },
    { screen: "hello", url: U.w("hello"), caption: "Step 1 of 8", detail: "Eight steps: Hello, Setup, Family, Personal, Health, Education, Employment and Admin. A green tick means done - Family already has one, because Sarah added James, Mia and Leo earlier. Tap any number to jump.", focus: P ? { x: 195, y: R(hello, "dots").y + 30, scale: 1.0 } : fzs(R(hello, "dots"), 1.5), ring: R(hello, "dots"), duration: 9000 },
    { screen: "hello", url: U.w("hello"), caption: "Your progress", detail: "Tap it for the whole list.", focus: fz(R(hello, "progressSum"), 1.4), ring: pad(R(hello, "progressSum"), 3), click: { x: R(hello, "progressSum").x + 120, y: R(hello, "progressSum").y + 22 }, duration: 5000 },
    { screen: "helloOpen", url: U.w("hello"), scroll: sF(helloOpen, "progress"), caption: "Every step, and where you are", detail: "Ticks for what's done, and \"You are here\". Tap any line to go straight to that step.", focus: fz(R(helloOpen, "progress"), 1.2), ring: pad(R(helloOpen, "progress"), 3), duration: 7000 },
    { screen: "hello", url: U.w("hello"), scroll: sF(hello, "tour"), caption: "Take the tour again", detail: "Plays the guided tour of the whole app from the dashboard.", focus: fz(span(R(hello, "helloP"), R(hello, "tour")), 1.3), ring: pad(R(hello, "tour"), 3), duration: 6000 },
    { screen: "hello", url: U.w("hello"), scroll: atFlow, caption: "How the pieces fit together", detail: "Setup fills your Organiser. Your Planner holds what matters most. You choose who to share with. Tap any circle to learn more.", focus: fz(R(hello, "flow"), 1.15), ring: pad(R(hello, "node0"), 3), click: mid(R(hello, "node0")), duration: 8000 },
    { screen: "node0", url: U.w("hello"), scroll: atFlow, caption: "Setup Guide", detail: "This page. Everything you type here goes straight into your Organiser folders - no double entry.", focus: dlg(nodeB[0]), ring: pad(R(nodeB[0], "dialog"), 2), click: mid(R(nodeB[0], "gotIt")), duration: 7000 },
    { screen: "node1", url: U.w("hello"), scroll: atFlow, caption: "Organiser", detail: "The heart of the app - a folder for everything, with a column for each family member. Open the Organiser takes you there.", focus: dlg(nodeB[1]), ring: pad(R(nodeB[1], "goto"), 3), click: mid(R(nodeB[1], "gotIt")), duration: 7000 },
    { screen: "node2", url: U.w("hello"), scroll: atFlow, caption: "Planner", detail: "The Peace of Mind Planner: letters, funeral wishes, last words - ready if your family ever needs them.", focus: dlg(nodeB[2]), ring: pad(R(nodeB[2], "dialog"), 2), click: mid(R(nodeB[2], "gotIt")), duration: 7000 },
    { screen: "node3", url: U.w("hello"), scroll: atFlow, caption: "Sharing", detail: "Not a page - a Share button on every folder and Planner section. Nothing is shared unless you choose to.", focus: dlg(nodeB[3]), ring: pad(R(nodeB[3], "dialog"), 2), click: mid(R(nodeB[3], "gotIt")), duration: 7000 },
    { screen: "hello", url: U.w("hello"), scroll: sF(hello, "video"), caption: "Walkthrough video", detail: "A short video tour goes here - it's coming soon.", focus: fz(R(hello, "video"), P ? 1.06 : 1.1), ring: pad(R(hello, "video"), 3), duration: 5000 },
    { screen: "hello", url: U.w("hello"), scroll: sF(hello, "tiles"), caption: "The four parts of the app", detail: "The Setup Guide, the Organiser, the Peace of Mind Planner, and Sharing - what each is for.", focus: fz(R(hello, "tiles"), P ? 1.0 : 1.1), ring: pad(R(hello, "tiles"), 4), duration: 8000 },
    { screen: "hello", url: U.w("hello"), scroll: sF(hello, "tal"), caption: "Where to start, and help on hand", detail: "Start with the Setup Guide - stop and pick it up whenever it suits. Stuck? Ask TAL AI, top right on every page.", focus: fz(span(R(hello, "where"), R(hello, "tal")), P ? 1.04 : 1.15), ring: pad(span(R(hello, "where"), R(hello, "tal")), 4), duration: 8000 },
    { screen: "hello", url: U.w("hello"), scroll: sF(hello, "go"), caption: "Show me around", detail: "Ticks Hello and moves on. \"Skip and explore on my own\" goes straight to the dashboard instead.", focus: btnFocus(hello, "go"), ring: pad(span(R(hello, "go"), R(hello, "skipHello")), 4), click: mid(R(hello, "go")), duration: 6500 },
    // Setup
    { screen: "welcome", url: U.w("welcome"), caption: "Step 2: Let's set up your Organiser", detail: "From here on, the banner at the top reminds you: what you type is saved straight into your Organiser folders.", focus: fz(span(R(welcome, "explain"), R(welcome, "dots")), P ? 1.0 : 1.15), ring: pad(R(welcome, "explain"), 3), duration: 7500 },
    { screen: "welcome", url: U.w("welcome"), scroll: sF(welcome, "list"), caption: "Section by section", detail: "Your family, then Personal, Health, Education and Employment (skip either if they don't apply), then Admin.", focus: fz(span(R(welcome, "hi"), R(welcome, "go")), P ? 1.04 : 1.2), ring: pad(R(welcome, "go"), 3), click: mid(R(welcome, "go")), duration: 7500 },
    // Family
    { screen: "family", url: U.w("family"), scroll: sF(family, "users"), caption: "Step 3: Add people in your family", detail: "Everyone you're organising for. Sarah, James, Mia and Leo are in. + Add user for anyone else; tap a person to edit their details.", focus: fz(R(family, "panel"), P ? 1.0 : 1.1), ring: pad(R(family, "users"), 4), duration: 8000 },
    { screen: "family", url: U.w("family"), scroll: sF(family, "confirm"), caption: "Have you added everyone?", detail: "Yes, everyone is added - or No, add another opens the form for a new person.", focus: fz(R(family, "confirm"), P ? 1.06 : 1.3), ring: pad(R(family, "yes"), 3), click: mid(R(family, "yes")), duration: 6500 },
    { screen: "familyAll", url: U.w("family"), scroll: sF(familyAll, "go"), caption: "Marked as complete", detail: "Undo if you've forgotten someone. Continue →. (With just yourself, the button says \"It's just me, continue\"; Skip for now moves on without ticking.)", focus: fz(span(R(familyAll, "undoBox"), R(familyAll, "go")), P ? 1.04 : 1.2), ring: pad(R(familyAll, "go"), 3), click: mid(R(familyAll, "go")), duration: 8000 },
    // Personal
    { screen: "personal", url: U.w("personal"), caption: "Step 4: Personal Information", detail: "Each section starts with what goes in it. \"Step 4 of 8 · 3 done\".", focus: fz(span(R(personal, "label"), R(personal, "sub")), P ? 1.04 : 1.25), ring: pad(span(R(personal, "label"), R(personal, "sub")), 6), duration: 6000 },
    { screen: "personal", url: U.w("personal"), scroll: sF(personal, "bullets"), caption: "What to add here", detail: "Emergency contacts and IDs first, then the rest when it suits. Fill in the form, upload a scan, or both.", focus: fz(span(R(personal, "intro"), R(personal, "bullets")), P ? 1.04 : 1.2), ring: pad(R(personal, "bullets"), 4), duration: 7500 },
    { screen: "personal", url: U.w("personal"), scroll: sF(personal, "legend"), caption: "Folders in this section", detail: "A row for each folder, a column for each person. ✓ complete, ◐ in progress, ✗ empty, — not applicable (no marriage certificate for Mia or Leo). The share icon: it can go in the Planner.", focus: fz(span(R(personal, "fhead"), R(personal, "legend")), P ? 1.04 : 1.3), ring: pad(span(R(personal, "fhead"), R(personal, "legend")), 4), duration: 9000 },
    { screen: "personal", url: U.w("personal"), scroll: sF(personal, `row:${why}`), caption: "Why? - why keep this?", detail: "Folders with a Learn article have a Why? link. Tap it for Birth Certificates.", focus: fzs(pad(R(personal, `why:${why}`), P ? 60 : 120), P ? 1.5 : 1.8), ring: pad(R(personal, `why:${why}`), 3), click: mid(R(personal, `why:${why}`)), duration: 6500 },
    { screen: "art", url: U.art, caption: "The article, with a way back", detail: "Why a birth certificate matters and how to replace one. While you're in the Setup Guide the menu is hidden, and the banner takes you back.", focus: fz(span(R(art, "banner"), R(art, "hdr")), P ? 1.04 : 1.2), ring: pad(R(art, "ret"), 3), click: mid(R(art, "ret")), duration: 8000 },
    { screen: "personal", url: U.w("personal"), scroll: sF(personal, `row:${ecRow}`), caption: "One square per person", detail: "Tap a square to open that folder on that person - here, Sarah's Emergency Contacts is ◐ started.", focus: fzs(pad(R(personal, `row:${ecRow}`), P ? 20 : 40), P ? 1.04 : 1.3), ring: pad(R(personal, `cell:${ecRow}:0`), 2), duration: 6500 },
    { screen: "personal", url: U.w("personal"), scroll: sF(personal, "go"), caption: "Keep going with Emergency Contacts →", detail: "Opens the first folder you've started (or \"Start with …\" if none). Let's go.", focus: btnFocus(personal, "go", 1.4), ring: pad(R(personal, "go"), 3), click: mid(R(personal, "go")), duration: 6500 },
    { screen: "ec", url: U.ec, caption: "You're in the Setup Guide", detail: "The folder opens on Sarah's own entry. No menu, just the form, and this banner.", focus: fz(span(R(ec, "banner"), R(ec, "head")), P ? 1.0 : 1.15), ring: pad(R(ec, "banner"), 3), duration: 6500 },
    { screen: "ec", url: U.ec, scroll: sF(ec, "phone"), caption: "Fill in what's missing", detail: "Her sister Emma is in - the phone number is still to go. Type it, then Save.", focus: fz(span(R(ec, "phone"), R(ec, "save")), P ? 1.04 : 1.15), ring: pad(R(ec, "phone"), 3), click: mid(R(ec, "save")), duration: 8500 },
    { screen: "ecDone", url: U.ec, caption: "Return to Setup Guide, or Next form", detail: "Next form opens the next folder - Family Members - so you can do several in a row. We'll go back.", focus: fz(R(ecDone, "banner"), P ? 1.04 : 1.3), ring: pad(span(R(ecDone, "ret"), R(ecDone, "next")), 3), click: mid(R(ecDone, "ret")), duration: 7000 },
    { screen: "personalEc", url: U.w("personal"), scroll: sF(personalEc, `row:${ecRow}`), caption: "Ticked in the matrix", detail: "Sarah's Emergency Contacts is ✓ now. The same folder, the same answers - nothing typed twice.", focus: fzs(pad(R(personalEc, `row:${ecRow}`), P ? 20 : 40), P ? 1.04 : 1.3), ring: pad(R(personalEc, `cell:${ecRow}:0`), 2), duration: 6000 },
    { screen: "personalEc", url: U.w("personal"), scroll: sF(personalEc, "enough"), caption: "I've done enough for now", detail: "Ticks the section and moves on. You don't have to fill every folder - come back any time.", focus: btnFocus(personalEc, "enough", 1.4), ring: pad(R(personalEc, "enough"), 3), click: mid(R(personalEc, "enough")), duration: 6500 },
    // Health + going back
    { screen: "health", url: U.w("health"), caption: "Step 5: Health & Wellbeing", detail: "Your GP and specialists, health plan, medications. Four steps ticked.", focus: fz(span(R(health, "dots"), R(health, "sub")), P ? 1.0 : 1.15), ring: pad(span(R(health, "label"), R(health, "sub")), 6), duration: 6500 },
    { screen: "health", url: U.w("health"), scroll: sF(health, "back"), caption: "← Back", detail: "Bottom left, under every step - goes back one.", focus: fzs(pad(R(health, "back"), P ? 60 : 120), P ? 1.5 : 1.8), ring: pad(R(health, "back"), 4), click: mid(R(health, "back")), duration: 5500 },
    { screen: "personalDone", url: U.w("personal"), scroll: sF(personalDone, "enough"), caption: "A finished section says Continue →", detail: "Personal is ticked, so its button is Continue →.", focus: btnFocus(personalDone, "enough", 1.4), ring: pad(R(personalDone, "enough"), 3), click: mid(R(personalDone, "enough")), duration: 6000 },
    { screen: "health", url: U.w("health"), scroll: sF(health, "go"), caption: "Back on Health", detail: "Keep going with List of Medical Advisers, or I've done enough for now.", focus: btnFocus(health, "go", 1.3), ring: pad(R(health, "enough"), 3), click: mid(R(health, "enough")), duration: 6500 },
    // Education - skipped
    { screen: "education", url: U.w("education"), scroll: sF(education, "go"), caption: "Step 6: Education - Skip this section", detail: "Not now? Skip this section (or Skip this step, below) moves on without a tick, so it waits for later.", focus: btnFocus(education, "skipSec", 1.4), ring: pad(R(education, "skipSec"), 4), click: mid(R(education, "skipSec")), duration: 7500 },
    // Employment
    { screen: "employment", url: U.w("employment"), scroll: sF(employment, "fhead"), caption: "Step 7: Employment", detail: "Employer, contracts, super and pay. Education has no tick - Sarah skipped it.", focus: fz(span(R(employment, "fhead"), R(employment, "legend")), P ? 1.04 : 1.2), ring: pad(span(R(employment, "fhead"), R(employment, "legend")), 4), duration: 6500 },
    { screen: "employment", url: U.w("employment"), scroll: sF(employment, "enough"), caption: "I've done enough for now", detail: "", focus: btnFocus(employment, "enough", 1.4), ring: pad(R(employment, "enough"), 3), click: mid(R(employment, "enough")), duration: 4500 },
    // Admin
    { screen: "admin", url: U.w("admin"), scroll: sF(admin, "table"), caption: "Step 8: Admin & Bookkeeping", detail: "Bank accounts, insurance, vehicles, utilities - and your receipts. Property Records is one record for the whole family.", focus: fz(R(admin, "table"), P ? 1.0 : 1.05), ring: pad(R(admin, "row:admin.property_records"), 2), duration: 7500 },
    { screen: "admin", url: U.w("admin"), scroll: sF(admin, "enough"), caption: "Last section done", detail: "", focus: btnFocus(admin, "enough", 1.4), ring: pad(R(admin, "enough"), 3), click: mid(R(admin, "enough")), duration: 4500 },
    // Finish
    { screen: "finish", url: U.w(), caption: "You're doing great!", detail: `"Wrap up · 7 of 8 done" and how much of the Organiser is filled in - ${PCT}%, ${ALL_DONE} of ${ALL_FOLDERS} folders.`, focus: fz(span(R(finish, "label"), R(finish, "left")), P ? 1.04 : 1.15), ring: pad(R(finish, "snap"), 3), duration: 7000 },
    { screen: "finish", url: U.w(), scroll: sF(finish, "push"), caption: "Get a heads-up before things expire?", detail: "A notification when a licence, rego or insurance is coming up. Nothing else.", focus: fz(R(finish, "push"), P ? 1.06 : 1.3), ring: pad(R(finish, "pushBtn"), 3), click: mid(R(finish, "pushBtn")), duration: 6500 },
    { screen: "finishPush", url: U.w(), scroll: sF(finishPush, "dash"), caption: "Notifications on", detail: "Dashboard to finish, or Organiser to see every folder.", focus: fz(span(R(finishPush, "push"), R(finishPush, "dash")), P ? 1.04 : 1.25), ring: pad(span(R(finishPush, "dash"), R(finishPush, "org")), 4), click: mid(R(finishPush, "dash")), duration: 6500 },
    // Back from the dashboard
    { screen: "dash", url: U.dash, caption: "The Setup guide card", detail: "Until every step is ticked, the dashboard keeps a Setup guide card - \"You're 7 of 8 steps in\". Click it to carry on.", focus: P ? { x: 195, y: R(dash, "wizard").y + 60, scale: 1.04 } : fzs(span(R(dash, "wizard"), R(dash, "progress")), 1.4), ring: pad(R(dash, "wizard"), 4), click: mid(R(dash, "wizard")), duration: 7000 },
    { screen: "back", url: U.w(), caption: "Straight to what you skipped", detail: "It opens on the first step that isn't ticked - Education. (Setup guide in the menu does the same.)", focus: fz(span(R(back, "dots"), R(back, "sub")), P ? 1.0 : 1.15), ring: pad(R(back, `dot:education`), 4), duration: 7000 },
    // Round buttons
    { screen: "dashFabs", url: U.dash, caption: "Two round buttons", detail: "? opens help for this page. Tap the tour button any time to watch this again — you're watching it now.", focus: P ? { x: 270, y: 780, scale: 1.5 } : { x: 1050, y: 640, scale: 1.8 }, ring: { x: fab.right - 128, y: fab.y, w: 128, h: 56 }, click: { x: fab.right - 100, y: fab.y + 28 }, duration: 7000 },
  ]
  return { screens, steps }
}

const D = build(DV)
const PH = build(PV)

export default function SetupGuideWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  const b = phone ? PH : D
  return (
    <WalkthroughPlayer music="/audio/prestart-music.mp3" key={dev} device={dev} steps={b.steps} screens={b.screens}
      title={phone ? "Setup guide (phone)" : "Setup guide (computer)"} url={U.w()} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "The Setup guide", subtitle: "Eight bite-size steps to set up your Organiser - and how to pick up where you left off" }} />
  )
}
