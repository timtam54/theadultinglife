"use client"

// "Settings" and "Security & Privacy" page walkthrough - the walkthrough (tour)
// button on /settings and /security (components/demo/PageWalkthroughFab).
// Not the "Safe and yours" one on /demo (SafeWalkthrough.tsx) - that stays as
// it is. Hand-built copies of the real screens with a made-up family's sample
// data (the Taylors, Brisbane) - no sign-in, no API calls. "Today" is Mon 23
// Nov 2026. Two versions (docs/Demo-Walkthroughs.md, rule 2):
//   computer - 1200 x 760, the sidebar + header layout (md and up)
//   phone    - 390 x 844, the mobile layout (header with logo, TAL AI, bell,
//              avatar, hamburger; single column)
// Covers every section and control on /settings, top to bottom: Download your
// organiser (Preparing…, done, what's in the .zip, the emailed link, the .json
// backup), What you've shared (grant with a dash, revoke with a view badge,
// each person's Download PDF / Share PDF, Share all with…), AI and your data
// (Reset AI consents), Setup guide (Restart + its confirm), App PIN (Change
// PIN - new PIN, confirm), Face ID (Remove, Turn on for this device),
// Interactive tours, Install on your phone (the three tabs), Microphone &
// voice input (the help dialog), Privacy requests (type, details, Send
// request, Request sent) and Delete account (Type DELETE, Cancel) - then
// /security: the four cards and both Quick actions (Settings, Emergency page).
// Sign-in is Google / Microsoft / Apple only - no passwords anywhere here.
// Copies: app/(app)/settings/page.tsx, CompleteExportButton (+ lib/services/
// complete-export: My Organiser.pdf / .xlsx / Documents/<section>/<folder>,
// email.ts), SharingMatrix (+ lib/services/sharing-matrix item labels),
// PdfActions + EmailFileDialog, ShareAllPlannerButton (+ planner-shareable
// labels), ResetAiConsentsButton, ResetSetupGuideButton + confirm-dialog,
// security/AppPinSection (PinDialog), security/FaceIdSection (+ webauthn
// device labels, face-id-client names), RetakeTourButton,
// RetakePlannerTourButton, InstallAppSection + InstallInstructions,
// MicHelpButton + MicHelpDialog, PrivacyRequestForm, DeleteAccountSection,
// app/(app)/security/page.tsx and the top of app/(app)/emergency/page.tsx.
// The shell and round buttons are copied from RemindersPageWalkthrough.
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

// Types the text out a letter at a time, each time its screen appears.
function Typed({ text, delay = 700, speed = 60 }: { text: string; delay?: number; speed?: number }) {
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
// Text heights - character widths a little generous so text never runs into
// the control under it.
const CW = 6.9, CWX = 5.9
const tl = (t: string, w: number) => wrapLines(t, w, CW) * 20
const tlx = (t: string, w: number) => wrapLines(t, w, CWX) * 16
const tlr = (t: string, w: number) => wrapLines(t, w, CW) * 23 // leading-relaxed

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
const NAV_SETTINGS = 11
const NAV_EMERGENCY = 10
const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" /><path d="m20 20-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
)
const PlusIcon = ({ size = 14, w = 2 }: { size?: number; w?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={w} strokeLinecap="round" /></svg>
)
const TalAiIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
)
const Avatar = ({ size = 36 }: { size?: number }) => (
  <span className="flex shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white" style={{ width: size, height: size }}>S</span>
)
// CompleteExportButton
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
// ResetAiConsentsButton / ResetSetupGuideButton / RetakeTourButton
const ResetIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M20 12a8 8 0 0 1-14 5.3M4 20v-4h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
// RetakePlannerTourButton
const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3l1.9 5.9L20 10l-6.1 1.1L12 17l-1.9-5.9L4 10l6.1-1.1L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
)
// MicHelpButton
const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.7" /><path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M12 18v3M8 21h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
)
// PdfActions
const PdfIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><text x="8" y="17" fontSize="6" fontWeight="700" fill="currentColor">PDF</text></svg>
)
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const TickIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
)
const BackspaceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9L3 12l6-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M12 9l4 6M16 9l-4 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
)
// security/page.tsx
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3 4 6v6c0 4.5 3 8 8 9 5-1 8-4.5 8-9V6l-8-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
)
const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" /></svg>
)
const CloudIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M7 18a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18 10.09 4 4 0 0 1 17 18H7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
)
const KeyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="8" cy="14" r="4" stroke="currentColor" strokeWidth="1.7" /><path d="m12 12 8-8m-3 3 2 2m-4 0 2 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
)
const FileIcon = ({ c }: { c: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className={c}><path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M15 3v4h4" stroke="currentColor" strokeWidth="1.7" /></svg>
)
const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="text-sky-600"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
)

// The two round buttons, bottom right: HelpButton (?) and TourFab (the
// compass), which plays this page's walkthrough.
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

/** Where the page content sits for each device. */
interface V { phone: boolean; x: number; w: number; W: number; H: number; top: number }
const DV: V = { phone: false, x: 272, w: 896, W: 1200, H: 760, top: 76 }
const PV: V = { phone: true, x: 8, w: 374, W: 390, H: 844, top: 116 }

// Computer header controls (layout.tsx / HeaderQuickBar / UserMenu)
const SB = 240
const navY = (k: number) => 168 + k * 41
const SEARCH = { x: 264, y: 12, w: 384, h: 40 }
const ADD = { x: 656, y: 12, w: 84, h: 40 }
const ASK = { x: 850, y: 12, w: 128, h: 40 }
const BELL = { x: 986, y: 12, w: 40, h: 40 }
const USER = { x: 1042, y: 14, w: 134, h: 36 }
// Phone header controls
const P_ASK = { x: 140, y: 58, w: 72, h: 36 }
const P_BELL = { x: 218, y: 56, w: 40, h: 40 }
const P_USER = { x: 262, y: 58, w: 64, h: 40 }
const P_MENU = { x: 334, y: 56, w: 40, h: 40 }
const FAB = (v: V) => (v.phone ? { y: 764, right: 366 } : { y: 680, right: 1176 })

function DShell({ children, h, nav }: { children: ReactNode; h: number; nav: number }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
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
      <Box x={SB} y={0} w={1200 - SB} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Box {...SEARCH} className="flex items-center gap-2 rounded-full border border-tal-line bg-white pl-3 text-sm">
        <span className="text-tal-plum-soft"><SearchIcon /></span><span className="text-tal-plum-soft">Search your organiser…</span>
      </Box>
      <Box {...ADD} className="flex items-center justify-center gap-1.5 rounded-full border border-tal-line bg-white text-sm font-medium"><PlusIcon />Add</Box>
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
      <Box x={0} y={0} w={390} h={44} className="flex items-center justify-between px-7 text-sm font-semibold text-tal-plum-dark"><span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span></Box>
      <Box x={0} y={44} w={390} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Img src="/icons-pwa/icon-192.png" x={16} y={58} w={36} />
      <Box {...P_ASK} className="flex items-center justify-center gap-1.5 rounded-full bg-black text-xs font-medium text-white"><TalAiIcon />TAL AI</Box>
      <Box {...P_BELL} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
      <Box {...P_USER} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2"><Avatar /><span className="text-xs text-tal-plum-soft">▾</span></Box>
      <Box {...P_MENU} className="flex items-center justify-center rounded-full">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </Box>
      {children}
    </div>
  )
}
const Shell = ({ v, h, nav = NAV_SETTINGS, children }: { v: V; h: number; nav?: number; children: ReactNode }) =>
  v.phone ? <PShell h={h}>{children}</PShell> : <DShell h={h} nav={nav}>{children}</DShell>

/** A dialog's dimmed backdrop over the whole (scrolled) screen. */
const Dim = ({ h, k = "bg-black/40" }: { h: number; k?: string }) => <Box x={0} y={0} w={1200} h={h} className={k} />
/** A fixed, centred dialog of width `w`, `h` tall, at scroll `at`. */
const centred = (v: V, at: number, w: number, h: number): Rect => {
  const ww = Math.min(w, v.W - 32)
  return { x: Math.round((v.W - ww) / 2), y: Math.round(at + Math.max(16, (v.H - h) / 2)), w: ww, h }
}

// ── Wording (from the components) ────────────────────────────────────────────

const T = {
  dl: "One download with everything in your family's organiser: a PDF laid out like the Organiser, an Excel workbook with a tab for every folder, and all your uploaded documents, scans and receipt photos in matching folders. It comes as a .zip file.",
  dlWorking: "This can take a minute or two if you have lots of documents. We'll also email you the link, so it's fine to leave this page.",
  dlDone: "Your download has started (48.6 MB, 63 documents). If it didn't, download it here. We've also emailed you the link — it works for 24 hours.",
  dlFoot: "Need the raw data for another app? Download a technical backup (.json). It doesn't include the documents themselves.",
  share: "Every item you've shared, and who can see it. Click a green view badge to revoke access, or a dash to grant access to someone already listed.",
  shareFoot: "Click view to revoke. Click — to add access. To share with someone new who isn't listed above yet, open the item and use its Share button.",
  ai: "Some features in The Adulting Life use AI to save you time. Think reading receipts, extracting details from documents, tidying up wording and turning your voice into text. Here's what you need to know:",
  aiList: [
    "AI features send the specific thing you're working on (a receipt photo, a document scan, a paragraph of text or a voice recording) to OpenAI, which powers those features.",
    "Nothing is sent to AI without your explicit consent. The first time you use each feature we ask you to confirm.",
    "OpenAI doesn't keep your input to train their models. They process it, return a result, and drop it.",
    "You can always type details in by hand and skip AI entirely.",
    "TAL AI (the chat) provides general guidance and wording help. Not legal, financial, tax or medical advice.",
  ],
  setup: "Restart the Setup guide from the beginning. This only resets your progress through the guide. Your records, uploads, and everything else in your account stay exactly where they are.",
  // The real text lists "or password" too - sign-in is Google / Apple / Microsoft only, so it's left out here.
  pin: "A 4-digit lock every time you open the app, plus after 15 minutes of inactivity. We email you whenever it's changed. Your sign-in (Google, Apple or Microsoft) is still needed once for the underlying account — the PIN is a second layer that only unlocks this device.",
  pinOn: "App PIN is on. You'll be asked for it every time you open the app and after 15 minutes of inactivity.",
  face: "Unlock the app with your face or fingerprint instead of typing your PIN. Turn it on separately on each phone or computer. Your device checks your face — The Adulting Life never sees or stores it. Your PIN still works as well.",
  tours: "Guided walkthroughs of the app. Replay any time — no data changes.",
  toursFoot: "The main tour covers the whole app. The Planner tour is a shorter 5-step walkthrough focused on letters, wishes and how sharing works inside your Peace of Mind Planner.",
  install: "Install The Adulting Life as an app on your home screen — one tap to open, works offline for what you've already viewed, and looks like any other app on your phone.",
  mic: "Anywhere the app has a Notes field, you can tap the microphone to talk instead of type. If your microphone isn't working or you've accidentally blocked it, use the guide below to enable it on your device or browser.",
  priv: "Ask us to access, correct, export or delete your personal information, or make a privacy complaint. Most requests you can action yourself in the app. This form is for anything you need us to do for you.",
  privFoot: "Sent to info@theadultinglife.com.au. We reply within 30 days.",
  privMsg: "Please correct my date of birth - it shows 1986 but it's 1985.",
  sent: "We'll get back to you within 30 days (usually much sooner). If it's urgent, you can also email info@theadultinglife.com.au directly.",
  del: "Deletes your Adulting Life account and, after 30 days, everything stored for your family group, including every family member's records, uploads and Peace of Mind Planner content.",
  delList: [
    "You're signed out immediately.",
    "Your account is scheduled to be permanently deleted 30 days from now, along with everything belonging to your family group: records, uploads, Peace of Mind Planner content, receipts, tasks, reminders.",
    "You can change your mind for the full 30 days. Sign back in during that window and click Cancel deletion on the red banner at the top of every page. Nothing is lost.",
    "After 30 days the deletion is permanent and cannot be undone.",
    "Grantees who've been shared items by you keep access until the 30-day purge.",
    "Some records may be retained if Australian law requires it (billing history, etc.).",
  ],
}
const PRIV_KINDS = ["Access my data", "Correct something", "Export my data (specific format)", "Delete my account", "Make a privacy complaint", "Other"]

type Tab = "ios" | "android" | "desktop"
const INSTALL_TABS: { id: Tab; label: string; w: number }[] = [
  { id: "ios", label: "iPhone / iPad", w: 108 }, { id: "android", label: "Android", w: 80 }, { id: "desktop", label: "Desktop", w: 80 },
]
// InstallInstructions (expanded). `icon` = the step shows a small browser icon.
const INSTALL_STEPS: Record<Tab, { t: ReactNode; plain: string; icon?: ReactNode }[]> = {
  ios: [
    { t: <>Tap the <b>Share</b> icon at the bottom of Safari:</>, plain: "Tap the Share icon at the bottom of Safari: [x]", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg> },
    { t: <>Scroll down in the share menu.</>, plain: "Scroll down in the share menu." },
    { t: <>Tap <b>&ldquo;Add to Home Screen&rdquo;</b></>, plain: "Tap \"Add to Home Screen\" [x]", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg> },
    { t: <>Tap <b>Add</b> in the top-right corner.</>, plain: "Tap Add in the top-right corner." },
    { t: <>Find <b>The Adulting Life</b> icon on your home screen and open it from there.</>, plain: "Find The Adulting Life icon on your home screen and open it from there." },
  ],
  android: [
    { t: <>Tap the <b>menu</b> icon (three dots) in the top-right of Chrome:</>, plain: "Tap the menu icon (three dots) in the top-right of Chrome: [x]", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg> },
    { t: <>Tap <b>&ldquo;Install app&rdquo;</b> or <b>&ldquo;Add to Home screen&rdquo;</b> (wording depends on your Chrome version).</>, plain: "Tap \"Install app\" or \"Add to Home screen\" (wording depends on your Chrome version)." },
    { t: <>Tap <b>Install</b> to confirm.</>, plain: "Tap Install to confirm." },
    { t: <>Find <b>The Adulting Life</b> icon in your app drawer or on your home screen.</>, plain: "Find The Adulting Life icon in your app drawer or on your home screen." },
  ],
  desktop: [
    { t: <>Look for the <b>install</b> icon in the browser address bar:</>, plain: "Look for the install icon in the browser address bar: [x]", icon: <DownloadIcon /> },
    { t: <>Click it, then <b>Install</b> in the small dialog that appears.</>, plain: "Click it, then Install in the small dialog that appears." },
    { t: <>If you don&apos;t see the icon: open the browser menu → look for <b>&ldquo;Install The Adulting Life&rdquo;</b>.</>, plain: "If you don't see the icon: open the browser menu → look for \"Install The Adulting Life\"." },
  ],
}

// ── Sample data (the Taylors of Brisbane, "today" 23 Nov 2026) ──────────────

const PEOPLE = [
  { id: "james", n: "James Taylor", e: "james.taylor@example.com" },
  { id: "emma", n: "Emma Clarke", e: "emma.clarke@example.com" },
]
// SharingMatrix rows: folder items sorted by folder, then Planner items (no folder).
const ITEMS: { k: string; label: string; sub?: string }[] = [
  { k: "home", label: "Home Insurance details", sub: "Home Insurance" },
  { k: "will", label: "Will & Funeral Instructions details", sub: "Will & Funeral Instructions" },
  { k: "letter", label: "Letter to Mia & Leo" },
  { k: "wish", label: "Wish for children" },
]
// ShareAllPlannerButton: Planner items grouped (groups sorted A-Z).
const SHAREABLE: [string, string[]][] = [
  ["Last words", ["Last words"]],
  ["Letters", ["Letter to James", "Letter to Mia & Leo"]],
  ["Wishes", ["Wishes — children", "Wishes — general"]],
]

interface St {
  exp?: "idle" | "working" | "done"
  granted?: boolean // James given the Will
  revoked?: boolean // Emma's Home Insurance taken away
  tableX?: number // phone: the sharing table swiped sideways
  aiReset?: boolean
  pinNew?: boolean
  removed?: boolean
  faceAdded?: boolean
  tab?: Tab
  priv?: "form" | "menu" | "filled" | "sent"
  del?: boolean
}
const has = (s: St, item: string, person: string) => {
  const k = `${item}|${person}`
  if (k === "will|james") return !!s.granted
  if (k === "home|emma") return !s.revoked
  return ["home|james", "will|emma", "letter|james", "letter|emma", "wish|james"].includes(k)
}
type Dev = { label: string; sub: string; id: string }
function devices(v: V, s: St): Dev[] {
  const other: Dev = v.phone
    ? { id: "mac", label: "Mac", sub: "Turned on 2 Oct 2026 · last used 21 Nov 2026" }
    : { id: "iphone", label: "iPhone", sub: "Turned on 2 Oct 2026 · last used 22 Nov 2026" }
  const old: Dev = { id: "ipad", label: "iPad", sub: "Turned on 14 Mar 2026 · last used 3 Jun 2026" }
  const added: Dev = v.phone ? { id: "new", label: "iPhone", sub: "Turned on 23 Nov 2026" } : { id: "new", label: "Mac", sub: "Turned on 23 Nov 2026" }
  return [other, ...(s.removed ? [] : [old]), ...(s.faceAdded ? [added] : [])]
}
const faceName = (v: V) => (v.phone ? "Face ID" : "Touch ID") // face-id-client: iPhone / Mac

// ── Settings layout ──────────────────────────────────────────────────────────

function setLayout(v: V, s: St) {
  const iw = v.w - 48, ix = v.x + 24
  let y = v.top
  const hdr = { x: v.x, y, w: v.w, h: 64 }
  y += 64 + 16
  // One section card: heading, intro, then the body from `cy`.
  const open = (intro: string, headH = 28, mb = 16, introW = iw) => {
    const top = y
    const introY = top + 24 + headH + 4
    const cy = introY + tl(intro, introW) + mb
    return { top, introY, cy }
  }
  const close = (top: number, cy: number): Rect => {
    const box = { x: v.x, y: top, w: v.w, h: cy + 24 - top }
    y = box.y + box.h + 16
    return box
  }

  // Download your organiser
  const d = open(T.dl)
  let cy = d.cy
  const dlBtn = { x: ix, y: cy, w: 256, h: 40 }
  cy += 40
  let dlStatus: Rect | undefined
  if (s.exp === "working" || s.exp === "done") {
    const th = tl(s.exp === "done" ? T.dlDone : T.dlWorking, iw)
    dlStatus = { x: ix, y: cy + 12, w: iw, h: th }
    cy += 12 + th
  }
  const dlFoot = { x: ix, y: cy + 16, w: iw, h: tlx(T.dlFoot, iw) }
  cy = dlFoot.y + dlFoot.h
  const dl = { box: close(d.top, cy), btn: dlBtn, status: dlStatus, foot: dlFoot, introY: d.introY }

  // What you've shared
  const shHead = v.phone ? 56 : 36
  const sh0 = open(T.share, shHead)
  const shareAll = { x: ix + iw - 132, y: sh0.top + 24, w: 132, h: 36 }
  const itemW = v.phone ? 140 : 368, colW = v.phone ? 176 : 240
  const headH = 100
  const rowH = ITEMS.map((it) => Math.max(44, 20 + wrapLines(it.label, itemW - 32, CW) * 20 + (it.sub ? wrapLines(it.sub, itemW - 32, 5.6) * 15 : 0)))
  const rowY: number[] = []
  let ry = headH
  for (const h of rowH) { rowY.push(ry); ry += h }
  const table = { x: ix, y: sh0.cy, w: iw, h: ry + 2 }
  const tx = s.tableX ?? 0
  const colX = (p: number) => table.x + itemW + p * colW - tx
  const cell = (i: number, p: number): Rect => {
    const on = has(s, ITEMS[i].k, PEOPLE[p].id)
    const w = on ? 56 : 24
    return { x: colX(p) + (colW - w) / 2, y: table.y + rowY[i] + (rowH[i] - 24) / 2, w, h: 24 }
  }
  const pdfBtn = (p: number): Rect => {
    const w = v.phone ? 36 : 118, g = 4
    const tot = v.phone ? 76 : 118 + g + 104
    return { x: colX(p) + (colW - tot) / 2, y: table.y + 58, w, h: 32 }
  }
  const shareBtn = (p: number): Rect => { const b = pdfBtn(p); return { ...b, x: b.x + b.w + 4, w: v.phone ? 36 : 104 } }
  const colRect = (p: number): Rect => ({ x: colX(p), y: table.y, w: colW, h: table.h })
  const itemRect = (i: number): Rect => ({ x: table.x, y: table.y + rowY[i], w: itemW, h: rowH[i] })
  const shFoot = { x: ix, y: table.y + table.h + 12, w: iw, h: tlx(T.shareFoot, iw) }
  const sh = { box: close(sh0.top, shFoot.y + shFoot.h), shareAll, table, itemW, colW, rowY, rowH, headH, cell, pdfBtn, shareBtn, colRect, itemRect, colX, foot: shFoot, intro: { x: ix, y: sh0.introY, w: iw, h: sh0.cy - 16 - sh0.introY } }

  // AI and your data
  const a = open(T.ai, 28, 12)
  cy = a.cy
  const aiList = { x: ix, y: cy, w: iw, h: 0 }
  T.aiList.forEach((t, k) => { cy += tl(t, iw - 20) + (k ? 6 : 0) })
  aiList.h = cy - aiList.y
  const aiBtn = { x: ix, y: cy + 16, w: s.aiReset ? 196 : 164, h: 36 }
  const ai = { box: close(a.top, aiBtn.y + 36), list: aiList, btn: aiBtn }

  // Setup guide
  const su = open(T.setup)
  const suBtn = { x: ix, y: su.cy, w: 196, h: 40 }
  const setup = { box: close(su.top, su.cy + 40), btn: suBtn }

  // App PIN
  const p0 = open(T.pin)
  const pinInfo = { x: ix, y: p0.cy, w: iw, h: tl(T.pinOn, iw) }
  const pinSet = { x: ix, y: pinInfo.y + pinInfo.h + 4, w: iw, h: 16 }
  const pinBtn = { x: ix, y: pinSet.y + 16 + 12, w: 112, h: 40 }
  const pin = { box: close(p0.top, pinBtn.y + 40), info: { ...pinInfo, h: pinInfo.h + 4 + 16 }, btn: pinBtn, intro: { x: ix, y: p0.introY, w: iw, h: p0.cy - 16 - p0.introY } }

  // Face ID
  const f0 = open(T.face)
  cy = f0.cy
  const devs = devices(v, s)
  const textW = iw - 32 - 12 - 84
  const devRows: Rect[] = [], removes: Rect[] = []
  for (const dv of devs) {
    const h = 24 + 20 + wrapLines(dv.sub, textW, CWX) * 16
    devRows.push({ x: ix, y: cy, w: iw, h })
    removes.push({ x: ix + iw - 16 - 84, y: cy + (h - 36) / 2, w: 84, h: 36 })
    cy += h
  }
  const devList = { x: ix, y: f0.cy, w: iw, h: cy - f0.cy + 2 }
  const faceBtn = { x: ix, y: cy + 2 + 16, w: v.phone ? 256 : 266, h: 40 }
  const face = { box: close(f0.top, faceBtn.y + 40), rows: devRows, removes, list: devList, btn: faceBtn, devs }

  // Interactive tours
  const t0 = open(T.tours)
  const tb1 = { x: ix, y: t0.cy, w: 182, h: 40 }
  const wrap2 = 182 + 8 + 186 > iw
  const tb2 = wrap2 ? { x: ix, y: t0.cy + 48, w: 186, h: 40 } : { x: ix + 190, y: t0.cy, w: 186, h: 40 }
  const tFoot = { x: ix, y: tb2.y + 40 + 12, w: iw, h: tlx(T.toursFoot, iw) }
  const tours = { box: close(t0.top, tFoot.y + tFoot.h), b1: tb1, b2: tb2, foot: tFoot }

  // Install on your phone
  const i0 = open(T.install)
  const tab = s.tab ?? (v.phone ? "ios" : "desktop")
  const tabs: Record<Tab, Rect> = { ios: { x: 0, y: 0, w: 0, h: 0 }, android: { x: 0, y: 0, w: 0, h: 0 }, desktop: { x: 0, y: 0, w: 0, h: 0 } }
  let tx2 = ix + 5
  for (const t of INSTALL_TABS) { tabs[t.id] = { x: tx2, y: i0.cy + 4, w: t.w, h: 32 }; tx2 += t.w + 4 }
  const tabBar = { x: ix, y: i0.cy, w: tx2 - ix + 1, h: 40 }
  const stepW = iw - 32 - 36
  const stepH = INSTALL_STEPS[tab].map((p) => Math.max(24, wrapLines(p.plain, stepW, CW) * (p.icon ? 28 : 20)))
  const instBox = { x: ix, y: i0.cy + 40 + 16, w: iw, h: 34 + stepH.reduce((a2, b) => a2 + b, 0) + (stepH.length - 1) * 12 }
  const install = { box: close(i0.top, instBox.y + instBox.h), tabs, tabBar, steps: instBox, stepH, tab }

  // Microphone & voice input
  const m0 = open(T.mic)
  const micBtn = { x: ix, y: m0.cy, w: 272, h: 40 }
  const mic = { box: close(m0.top, m0.cy + 40), btn: micBtn }

  // Privacy requests
  const r0 = open(T.priv)
  let privEnd: number
  const select = { x: ix, y: r0.cy + 20, w: iw, h: 44 }
  const textarea = { x: ix, y: select.y + 44 + 12 + 20, w: iw, h: 118 }
  const ftY = textarea.y + 118 + 12
  const ftTextH = tlx(T.privFoot, v.phone ? iw : iw - 140)
  const send = v.phone ? { x: ix, y: ftY + ftTextH + 12, w: 128, h: 40 } : { x: ix + iw - 128, y: ftY, w: 128, h: 40 }
  const privFoot = { x: ix, y: v.phone ? ftY : ftY + (40 - ftTextH) / 2, w: v.phone ? iw : iw - 140, h: ftTextH }
  let sentBox: Rect | undefined, sendAnother: Rect | undefined
  if (s.priv === "sent") {
    const th = tl(T.sent, iw - 34)
    sentBox = { x: ix, y: r0.cy, w: iw, h: 34 + 20 + 4 + th + 12 + 20 }
    sendAnother = { x: ix + 17, y: sentBox.y + sentBox.h - 17 - 20, w: 96, h: 20 }
    privEnd = sentBox.y + sentBox.h
  } else privEnd = send.y + 40
  const priv = { box: close(r0.top, privEnd), select, textarea, send, foot: privFoot, sentBox, sendAnother, form: { x: ix, y: r0.cy, w: iw, h: privEnd - r0.cy } }

  // Delete account (account holder only)
  const x0 = open(T.del)
  cy = x0.cy
  const delList = { x: ix, y: cy, w: iw, h: 0 }
  T.delList.forEach((t, k) => { cy += tlx(t, iw - 20) + (k ? 4 : 0) })
  delList.h = cy - delList.y
  cy += 16
  const delBtn = { x: ix, y: cy, w: 164, h: 40 }
  const confirm = { x: ix, y: cy, w: iw, h: 152 }
  const delInput = { x: ix + 17, y: cy + 17 + 20 + 8, w: iw - 34, h: 40 }
  const perm = { x: ix + iw - 17 - 216, y: delInput.y + 40 + 12, w: 216, h: 36 }
  const cancelDel = { x: perm.x - 8 - 80, y: perm.y, w: 80, h: 36 }
  const del = { box: close(x0.top, s.del ? confirm.y + confirm.h : cy + 40), list: delList, btn: delBtn, confirm, input: delInput, perm, cancel: cancelDel, intro: { x: ix, y: x0.introY, w: iw, h: x0.cy - 16 - x0.introY } }

  const h = Math.max(v.H, y + 24)
  return { h, hdr, iw, ix, dl, sh, ai, setup, pin, face, tours, install, mic, priv, del }
}
type SL = ReturnType<typeof setLayout>

// ── Settings screen ──────────────────────────────────────────────────────────

const H2 = ({ y, x, w, children, danger }: { y: number; x: number; w: number; children: ReactNode; danger?: boolean }) => (
  <Box x={x} y={y} w={w} h={28} className={`font-display text-xl leading-7 ${danger ? "text-red-800" : "text-tal-plum"}`}>{children}</Box>
)
const Intro = ({ x, y, w, children, danger }: { x: number; y: number; w: number; children: ReactNode; danger?: boolean }) => (
  <Box x={x} y={y} w={w} h={20} className={`text-sm leading-5 ${danger ? "text-red-900/80" : "text-tal-plum-soft"}`}>{children}</Box>
)
const OutlineBtn = ({ r, children, className = "" }: { r: Rect; children: ReactNode; className?: string }) => (
  <Box {...r} className={`flex items-center justify-center gap-2 rounded-lg border border-tal-line bg-white text-sm text-tal-plum ${className}`}>{children}</Box>
)
const DarkBtn = ({ r, children, className = "rounded-lg" }: { r: Rect; children: ReactNode; className?: string }) => (
  <Box {...r} className={`flex items-center justify-center gap-2 bg-black text-sm font-medium text-white ${className}`}>{children}</Box>
)
const ViewBadge = ({ r }: { r: Rect }) => (
  <Box {...r} className="flex items-center justify-center gap-1 rounded-md bg-emerald-50 text-xs font-medium text-emerald-700"><TickIcon />view</Box>
)

function SharingTable({ v, L, s }: { v: V; L: SL; s: St }) {
  const { sh } = L
  const t = sh.table
  const rel = (r: Rect) => ({ ...r, x: r.x - t.x, y: r.y - t.y })
  return (
    <Box {...t} className="overflow-hidden rounded-2xl border border-tal-line bg-white text-sm">
      <Box x={0} y={0} w={t.w} h={sh.headH} className="bg-tal-cream-soft" />
      {PEOPLE.map((p, k) => (
        <Box key={p.id} x={sh.colX(k) - t.x} y={0} w={sh.colW} h={sh.headH} className="flex flex-col items-center pt-3 text-center">
          <div className="font-medium leading-tight">{p.n}</div>
          <div className="max-w-[160px] truncate text-[10px] text-tal-plum-soft">{p.e}</div>
        </Box>
      ))}
      {PEOPLE.map((p, k) => (
        <div key={`b${p.id}`}>
          <Box {...rel(sh.pdfBtn(k))} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><PdfIcon />{!v.phone && "Download PDF"}</Box>
          <Box {...rel(sh.shareBtn(k))} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><MailIcon />{!v.phone && "Share PDF"}</Box>
        </div>
      ))}
      {ITEMS.map((it, i) => (
        <Box key={it.k} x={0} y={sh.rowY[i]} w={t.w} h={sh.rowH[i]} className="border-t border-tal-line/60" />
      ))}
      {ITEMS.map((it, i) => PEOPLE.map((p, k) => {
        const r = rel(sh.cell(i, k))
        return has(s, it.k, p.id)
          ? <ViewBadge key={`${it.k}${p.id}`} r={r} />
          : <Box key={`${it.k}${p.id}`} {...r} className="flex items-center justify-center text-lg text-tal-plum-soft/50">—</Box>
      }))}
      {/* The sticky "Shared item" column */}
      <Box x={0} y={0} w={sh.itemW} h={sh.headH} className={`flex items-center bg-tal-cream-soft px-4 font-medium ${v.phone && (s.tableX ?? 0) > 0 ? "shadow-[4px_0_6px_-4px_rgba(0,0,0,0.15)]" : ""}`}>Shared item</Box>
      {ITEMS.map((it, i) => (
        <Box key={`l${it.k}`} x={0} y={sh.rowY[i]} w={sh.itemW} h={sh.rowH[i]} className="border-t border-tal-line/60 bg-white px-4 pt-2.5">
          <div className="leading-5 text-tal-plum">{it.label}</div>
          {it.sub && <div className="text-[11px] leading-[15px] text-tal-plum-soft">{it.sub}</div>}
        </Box>
      ))}
    </Box>
  )
}

/** The whole Settings page in a given state. `children` draws pop-ups on top. */
function Settings({ v, s, children, fabs }: { v: V; s: St; children?: ReactNode; fabs?: boolean }) {
  const L = setLayout(v, s)
  const { iw, ix } = L
  const sec = (b: Rect, danger?: boolean) => <Box {...b} className={`rounded-2xl border ${danger ? "border-red-300 bg-red-50/40" : "border-tal-line bg-white"}`} />
  const h2y = (b: Rect) => b.y + 24
  const introY = (b: Rect, head = 28) => b.y + 24 + head + 4
  return (
    <Shell v={v} h={L.h}>
      {/* Header */}
      <Box {...L.hdr} className="flex items-center gap-3 rounded-2xl bg-black px-6 text-white shadow-md">
        <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">Settings</span>
        <span className="font-display text-2xl leading-tight">Your account</span>
      </Box>

      {/* Download your organiser */}
      {sec(L.dl.box)}
      <H2 x={ix} y={h2y(L.dl.box)} w={iw}>Download your organiser</H2>
      <Intro x={ix} y={introY(L.dl.box)} w={iw}>{T.dl}</Intro>
      <DarkBtn r={L.dl.btn} className={`rounded-lg ${s.exp === "working" ? "opacity-60" : ""}`}><DownloadIcon />{s.exp === "working" ? "Preparing your download…" : "Download complete organiser"}</DarkBtn>
      {L.dl.status && (
        <Box {...L.dl.status} className={`text-sm leading-5 ${s.exp === "done" ? "text-tal-plum" : "text-tal-plum-soft"}`}>
          {s.exp === "done"
            ? <>Your download has started (48.6 MB, 63 documents). If it didn&apos;t, <span className="underline">download it here</span>. We&apos;ve also emailed you the link — it works for 24 hours.</>
            : T.dlWorking}
        </Box>
      )}
      <Box {...L.dl.foot} className="text-xs leading-4 text-tal-plum-soft">Need the raw data for another app? <span className="underline">Download a technical backup (.json)</span>. It doesn&apos;t include the documents themselves.</Box>

      {/* What you've shared */}
      {sec(L.sh.box)}
      <Box x={ix} y={h2y(L.sh.box)} w={iw - 144} h={v.phone ? 56 : 28} className="font-display text-xl leading-7">What you&apos;ve shared</Box>
      <DarkBtn r={L.sh.shareAll} className="rounded-xl">Share all with…</DarkBtn>
      <Intro x={ix} y={L.sh.intro.y} w={iw}>Every item you&apos;ve shared, and who can see it. Click a green <span className="mx-1 inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">view</span> badge to revoke access, or a dash to grant access to someone already listed.</Intro>
      <SharingTable v={v} L={L} s={s} />
      <Box {...L.sh.foot} className="text-xs leading-4 text-tal-plum-soft">Click <span className="font-medium text-emerald-700">view</span> to revoke. Click <span className="font-medium">—</span> to add access. To share with someone new who isn&apos;t listed above yet, open the item and use its Share button.</Box>

      {/* AI and your data */}
      {sec(L.ai.box)}
      <H2 x={ix} y={h2y(L.ai.box)} w={iw}>AI and your data</H2>
      <Intro x={ix} y={introY(L.ai.box)} w={iw}>{T.ai}</Intro>
      <Box {...L.ai.list}>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-5 text-tal-plum-soft">{T.aiList.map((t) => <li key={t}>{t}</li>)}</ul>
      </Box>
      <OutlineBtn r={L.ai.btn} className="gap-1.5"><ResetIcon size={14} />{s.aiReset ? "Reset — will ask again" : "Reset AI consents"}</OutlineBtn>

      {/* Setup guide */}
      {sec(L.setup.box)}
      <H2 x={ix} y={h2y(L.setup.box)} w={iw}>Setup guide</H2>
      <Intro x={ix} y={introY(L.setup.box)} w={iw}>{T.setup}</Intro>
      <OutlineBtn r={L.setup.btn}><ResetIcon />Restart Setup guide</OutlineBtn>

      {/* App PIN */}
      {sec(L.pin.box)}
      <H2 x={ix} y={h2y(L.pin.box)} w={iw}>App PIN</H2>
      <Intro x={ix} y={introY(L.pin.box)} w={iw}>{T.pin}</Intro>
      <Box x={ix} y={L.pin.info.y} w={iw} h={20} className="text-sm leading-5"><span className="font-medium">App PIN is on.</span> You&apos;ll be asked for it every time you open the app and after 15 minutes of inactivity.</Box>
      <Box x={ix} y={L.pin.info.y + L.pin.info.h - 16} w={iw} h={16} className="text-xs leading-4 text-tal-plum-soft">Set {s.pinNew ? "23 Nov 2026" : "2 Oct 2026"}</Box>
      <OutlineBtn r={L.pin.btn}>Change PIN</OutlineBtn>

      {/* Face ID */}
      {sec(L.face.box)}
      <H2 x={ix} y={h2y(L.face.box)} w={iw}>Face ID</H2>
      <Intro x={ix} y={introY(L.face.box)} w={iw}>{T.face}</Intro>
      <Box {...L.face.list} className="rounded-xl border border-tal-line" />
      {L.face.devs.map((d, k) => (
        <div key={d.id}>
          {k > 0 && <Box x={ix + 1} y={L.face.rows[k].y} w={iw - 2} h={1} className="bg-tal-line" />}
          <Box x={ix + 16} y={L.face.rows[k].y + 12} w={iw - 32 - 96} h={L.face.rows[k].h - 24}>
            <div className="text-sm font-medium leading-5">{d.label}</div>
            <div className="text-xs leading-4 text-tal-plum-soft">{d.sub}</div>
          </Box>
          <Box {...L.face.removes[k]} className="flex items-center justify-center rounded-lg border border-tal-line bg-white text-sm text-red-700">Remove</Box>
        </div>
      ))}
      <DarkBtn r={L.face.btn}>{`Turn on ${faceName(v)} for this device`}</DarkBtn>

      {/* Interactive tours */}
      {sec(L.tours.box)}
      <H2 x={ix} y={h2y(L.tours.box)} w={iw}>Interactive tours</H2>
      <Intro x={ix} y={introY(L.tours.box)} w={iw}>{T.tours}</Intro>
      <OutlineBtn r={L.tours.b1}><ResetIcon />Take the tour again</OutlineBtn>
      <OutlineBtn r={L.tours.b2}><StarIcon />Replay Planner tour</OutlineBtn>
      <Box {...L.tours.foot} className="text-xs leading-4 text-tal-plum-soft">{T.toursFoot}</Box>

      {/* Install on your phone */}
      {sec(L.install.box)}
      <H2 x={ix} y={h2y(L.install.box)} w={iw}>Install on your phone</H2>
      <Intro x={ix} y={introY(L.install.box)} w={iw}>{T.install}</Intro>
      <Box {...L.install.tabBar} className="rounded-full border border-tal-line bg-tal-cream-soft" />
      {INSTALL_TABS.map((t) => {
        const active = L.install.tab === t.id
        const suggested = (v.phone ? "ios" : "desktop") === t.id
        return (
          <Box key={t.id} {...L.install.tabs[t.id]} className={`flex items-center justify-center gap-1.5 rounded-full text-xs font-medium ${active ? "bg-tal-plum text-white shadow-sm" : "text-tal-plum-soft"}`}>
            {t.label}{suggested && !active && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />}
          </Box>
        )
      })}
      <Box {...L.install.steps} className="rounded-xl border border-tal-line bg-tal-cream-soft/60 p-4">
        <ol className="space-y-3 text-sm text-tal-plum">
          {INSTALL_STEPS[L.install.tab].map((p, k) => (
            <li key={k} className="flex items-start gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tal-plum text-[11px] font-bold text-white">{k + 1}</span>
              <span className="flex flex-1 flex-wrap items-center gap-1 leading-5">{p.t}{p.icon && <span className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-tal-cream text-tal-plum">{p.icon}</span>}</span>
            </li>
          ))}
        </ol>
      </Box>

      {/* Microphone & voice input */}
      {sec(L.mic.box)}
      <H2 x={ix} y={h2y(L.mic.box)} w={iw}>Microphone &amp; voice input</H2>
      <Intro x={ix} y={introY(L.mic.box)} w={iw}>{T.mic}</Intro>
      <OutlineBtn r={L.mic.btn}><MicIcon />How to enable your microphone</OutlineBtn>

      {/* Privacy requests */}
      {sec(L.priv.box)}
      <H2 x={ix} y={h2y(L.priv.box)} w={iw}>Privacy requests</H2>
      <Intro x={ix} y={introY(L.priv.box)} w={iw}>{T.priv}</Intro>
      {L.priv.sentBox ? (
        <>
          <Box {...L.priv.sentBox} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-medium leading-5 text-emerald-900">Request sent.</p>
            <p className="mt-1 text-sm leading-5 text-emerald-900/80">We&apos;ll get back to you within 30 days (usually much sooner). If it&apos;s urgent, you can also email <span className="underline">info@theadultinglife.com.au</span> directly.</p>
          </Box>
          <Box {...L.priv.sendAnother!} className="text-sm leading-5 text-emerald-900 underline">Send another</Box>
        </>
      ) : (
        <>
          <Box x={ix} y={L.priv.select.y - 20} w={iw} h={16} className="text-xs uppercase leading-4 tracking-widest text-tal-plum-soft">Type of request</Box>
          <Box {...L.priv.select} className={`flex items-center justify-between rounded-xl border bg-white px-3 text-sm ${s.priv === "menu" ? "border-tal-plum/40 ring-2 ring-tal-plum/40" : "border-tal-line"}`}>
            {s.priv === "filled" ? "Correct something" : "Access my data"}<span className="text-xs text-tal-plum-soft">▾</span>
          </Box>
          <Box x={ix} y={L.priv.textarea.y - 20} w={iw} h={16} className="text-xs uppercase leading-4 tracking-widest text-tal-plum-soft">Tell us more (optional)</Box>
          <Box {...L.priv.textarea} className={`rounded-xl border border-tal-line bg-white px-3 py-2 text-sm leading-5 ${s.priv === "filled" ? "text-tal-plum" : "text-tal-plum-soft/60"}`}>
            {s.priv === "filled" ? <Typed text={T.privMsg} delay={400} speed={40} /> : "Any details that will help us action your request."}
          </Box>
          <Box {...L.priv.foot} className="text-xs leading-4 text-tal-plum-soft">Sent to <strong>info@theadultinglife.com.au</strong>. We reply within 30 days.</Box>
          <DarkBtn r={L.priv.send} className="rounded-xl">Send request</DarkBtn>
          {s.priv === "menu" && (
            <Box x={ix} y={L.priv.select.y + 48} w={v.phone ? iw : 300} h={PRIV_KINDS.length * 34 + 8} className="rounded-xl border border-tal-line bg-white py-1 shadow-lg">
              {PRIV_KINDS.map((o) => <p key={o} className={`flex h-[34px] items-center px-3 text-sm ${o === "Access my data" ? "bg-blue-600 text-white" : ""}`}>{o}</p>)}
            </Box>
          )}
        </>
      )}

      {/* Delete account */}
      {sec(L.del.box, true)}
      <H2 x={ix} y={h2y(L.del.box)} w={iw} danger>Delete account</H2>
      <Intro x={ix} y={introY(L.del.box)} w={iw} danger>{T.del}</Intro>
      <Box {...L.del.list}>
        <ul className="list-disc space-y-1 pl-5 text-xs leading-4 text-red-900/70">
          <li>You&apos;re signed out immediately.</li>
          <li>Your account is scheduled to be permanently deleted <strong>30 days from now</strong>, along with everything belonging to your family group: records, uploads, Peace of Mind Planner content, receipts, tasks, reminders.</li>
          <li><strong>You can change your mind for the full 30 days.</strong> Sign back in during that window and click <em>Cancel deletion</em> on the red banner at the top of every page. Nothing is lost.</li>
          <li>After 30 days the deletion is permanent and cannot be undone.</li>
          <li>Grantees who&apos;ve been shared items by you keep access until the 30-day purge.</li>
          <li>Some records may be retained if Australian law requires it (billing history, etc.).</li>
        </ul>
      </Box>
      {s.del ? (
        <>
          <Box {...L.del.confirm} className="rounded-xl border border-red-300 bg-white" />
          <Box x={L.del.input.x} y={L.del.confirm.y + 17} w={L.del.input.w} h={20} className="text-sm font-medium leading-5 text-red-800">Type DELETE below to confirm.</Box>
          <Box {...L.del.input} className="flex items-center rounded-lg border border-red-300 px-3 text-sm text-tal-plum-soft/50">DELETE</Box>
          <Box {...L.del.cancel} className="flex items-center justify-center rounded-lg text-sm text-tal-plum">Cancel</Box>
          <Box {...L.del.perm} className="flex items-center justify-center rounded-lg bg-red-600 text-sm font-medium text-white opacity-60">Permanently delete account</Box>
        </>
      ) : (
        <Box {...L.del.btn} className="flex items-center justify-center rounded-lg bg-red-600 text-sm font-medium text-white">Delete my account</Box>
      )}

      {fabs && <Fabs {...FAB(v)} />}
      {children}
    </Shell>
  )
}

// ── Pop-ups on Settings ──────────────────────────────────────────────────────

/** What's inside the downloaded zip (lib/services/complete-export). */
const ZIP_ROWS: { n: string; note?: string; d: number; k: "pdf" | "xls" | "dir" | "file" }[] = [
  { n: "My Organiser.pdf", note: "Laid out like the Organiser", d: 0, k: "pdf" },
  { n: "My Organiser.xlsx", note: "A tab for every folder", d: 0, k: "xls" },
  { n: "Documents", d: 0, k: "dir" },
  { n: "Personal", d: 1, k: "dir" },
  { n: "Passport", d: 2, k: "dir" },
  { n: "Sarah Taylor - passport.jpg", d: 3, k: "file" },
  { n: "Health", d: 1, k: "dir" },
  { n: "Admin & Bookkeeping", d: 1, k: "dir" },
  { n: "Home Insurance", d: 2, k: "dir" },
  { n: "Sarah Taylor - policy schedule.pdf", d: 3, k: "file" },
  { n: "Receipts", d: 1, k: "dir" },
  { n: "2026-27", d: 2, k: "dir" },
]
const zipRect = (v: V): Rect => (v.phone ? { x: 16, y: 150, w: 358, h: 48 + ZIP_ROWS.length * 38 } : { x: 640, y: 92, w: 520, h: 48 + ZIP_ROWS.length * 38 })
function ZipWindow({ v }: { v: V }) {
  const r = zipRect(v)
  return (
    <Box {...r} className="overflow-hidden rounded-xl border border-gray-300 bg-white font-sans text-gray-900 shadow-2xl">
      <div className="flex h-12 items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 text-sm font-medium">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-amber-600" aria-hidden><path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M11 3v2h2v2h-2v2h2v2h-2" stroke="currentColor" strokeWidth="1.5" /></svg>
        <span className="truncate">The Adulting Life - My Organiser - 2026-11-23.zip</span>
        <span className="ml-auto shrink-0 text-xs font-normal text-gray-500">48.6 MB</span>
      </div>
      {ZIP_ROWS.map((z) => (
        <div key={z.n} className="flex h-[38px] items-center gap-2 border-b border-gray-100 pr-4 text-sm" style={{ paddingLeft: 16 + z.d * (v.phone ? 16 : 22) }}>
          {z.k === "dir" ? <FolderIcon /> : <FileIcon c={z.k === "pdf" ? "text-red-600" : z.k === "xls" ? "text-emerald-700" : "text-gray-500"} />}
          <span className={`truncate ${z.k === "file" ? "" : "font-medium"}`}>{z.n}</span>
          {z.note && <span className="ml-auto shrink-0 text-xs text-gray-500">{z.note}</span>}
        </div>
      ))}
    </Box>
  )
}
// The "download is ready" email (lib/services/complete-export/email.ts).
const mailRect = (v: V): Rect => (v.phone ? { x: 16, y: 140, w: 358, h: 560 } : { x: 620, y: 92, w: 540, h: 400 })
function ExportEmail({ v }: { v: V }) {
  const r = mailRect(v)
  return (
    <Box {...r} className="overflow-hidden rounded-xl border border-gray-300 bg-white font-sans text-gray-900 shadow-2xl">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-600">
        <div><span className="text-gray-400">From</span> The Adulting Life</div>
        <div><span className="text-gray-400">To</span> sarah.taylor@example.com</div>
        <div className="mt-1 text-sm font-semibold text-gray-900">Your organiser download is ready — The Adulting Life</div>
      </div>
      <div className="space-y-3 px-4 py-4 text-sm leading-relaxed">
        <p>Your complete Adulting Life organiser is ready to download:</p>
        <p className="break-all text-blue-700 underline">https://app.theadultinglife.com.au/exports/…/The Adulting Life - My Organiser - 2026-11-23.zip</p>
        <p>It includes a PDF of your organiser, an Excel workbook with every folder, and all your uploaded documents. The link works for 24 hours. After that, download it again from Settings.</p>
        <p>The download contains private information — keep it somewhere safe.</p>
      </div>
    </Box>
  )
}

// SharingMatrix's Modal (max-w-md, p-5).
const shareModalText = (kind: "grant" | "revoke") => kind === "grant"
  ? "James Taylor will be able to view Will & Funeral Instructions details in their Planner. They'll get an email letting them know."
  : "Emma Clarke will lose access to Home Insurance details. You can grant access again any time."
function shareModal(v: V, at: number, kind: "grant" | "revoke") {
  const w = Math.min(448, v.W - 32)
  const h = 20 + 28 + 4 + tl(shareModalText(kind), w - 40) + 16 + 36 + 20
  const r = centred(v, at, 448, h)
  const okW = kind === "grant" ? 146 : 104
  const ok = { x: r.x + r.w - 20 - okW, y: r.y + r.h - 20 - 36, w: okW, h: 36 }
  return { r, ok, cancel: { x: ok.x - 8 - 76, y: ok.y, w: 76, h: 36 } }
}
function ShareModal({ v, at, kind, h }: { v: V; at: number; kind: "grant" | "revoke"; h: number }) {
  const m = shareModal(v, at, kind)
  return (
    <>
      <Dim h={h} />
      <Box {...m.r} className="rounded-2xl bg-white p-5 shadow-2xl">
        <h3 className="font-display text-lg leading-7 text-tal-plum">{kind === "grant" ? "Grant access?" : "Revoke access?"}</h3>
        <p className="mt-1 text-sm leading-5 text-tal-plum-soft">
          {kind === "grant"
            ? <><span className="font-medium text-tal-plum">James Taylor</span> will be able to view <span className="font-medium text-tal-plum">Will &amp; Funeral Instructions details</span> in their Planner. They&apos;ll get an email letting them know.</>
            : <><span className="font-medium text-tal-plum">Emma Clarke</span> will lose access to <span className="font-medium text-tal-plum">Home Insurance details</span>. You can grant access again any time.</>}
        </p>
      </Box>
      <Box {...m.cancel} className="flex items-center justify-center rounded-lg border border-tal-line text-sm">Cancel</Box>
      <Box {...m.ok} className={`flex items-center justify-center rounded-lg text-sm font-medium text-white ${kind === "grant" ? "bg-tal-plum" : "bg-red-600"}`}>{kind === "grant" ? "Yes, grant access" : "Yes, revoke"}</Box>
    </>
  )
}

// EmailFileDialog ("Share by email"), from a person's Share PDF.
const EMAIL_NOTE = "Sent from The Adulting Life with your name on it. Replies come to your email address."
const SENT_TEXT = "Sent to emma.clarke@example.com. The document is attached."
function emailDlg(v: V, at: number, sent: boolean) {
  const w = Math.min(448, v.W - 32)
  const h = sent ? 20 + 28 + 20 + 16 + tl(SENT_TEXT, w - 40) + 20 + 40 + 20 : 20 + 28 + 20 + 16 + 24 + 44 + 12 + 24 + 78 + 8 + tlx(EMAIL_NOTE, w - 40) + 20 + 40 + 20
  const r = centred(v, at, 448, h)
  const send = { x: r.x + r.w - 20 - 72, y: r.y + r.h - 20 - 40, w: 72, h: 40 }
  const done = { x: r.x + r.w - 20 - 72, y: r.y + r.h - 20 - 40, w: 72, h: 40 }
  return { r, send, done, cancel: { x: send.x - 8 - 82, y: send.y, w: 82, h: 40 }, to: { x: r.x + 20, y: r.y + 20 + 28 + 20 + 16 + 24, w: r.w - 40, h: 44 } }
}
function EmailDialog({ v, at, h, sent }: { v: V; at: number; h: number; sent?: boolean }) {
  const e = emailDlg(v, at, !!sent)
  return (
    <>
      <Dim h={h} k="bg-black/50" />
      <Box {...e.r} className="rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="font-display text-lg leading-7 text-tal-plum">Share by email</h2>
        <p className="mt-1 truncate text-xs leading-4 text-tal-plum-soft">What you have shared with Emma Clarke (PDF)</p>
        {sent ? (
          <p className="mt-4 text-sm leading-5 text-tal-plum">Sent to <span className="font-medium">emma.clarke@example.com</span>. The document is attached.</p>
        ) : (
          <>
            <p className="mb-1 mt-4 text-sm leading-5 text-tal-plum">Recipient&apos;s email</p>
            <div className="flex h-11 items-center rounded-xl border border-tal-line px-3 text-sm"><Typed text="emma.clarke@example.com" delay={500} speed={45} /></div>
            <p className="mb-1 mt-3 text-sm leading-5 text-tal-plum">Message <span className="text-tal-plum-soft">(optional)</span></p>
            <div className="h-[78px] rounded-xl border border-tal-line px-3 py-2 text-sm leading-5">Here&apos;s everything I&apos;ve shared with you in the app.</div>
            <p className="mt-2 text-xs leading-4 text-tal-plum-soft">{EMAIL_NOTE}</p>
          </>
        )}
      </Box>
      {sent
        ? <DarkBtn r={e.done} className="rounded-xl">Done</DarkBtn>
        : <><Box {...e.cancel} className="flex items-center justify-center rounded-xl border border-tal-line text-sm">Cancel</Box><DarkBtn r={e.send} className="rounded-xl">Send</DarkBtn></>}
    </>
  )
}

// ShareAllPlannerButton's dialog.
const SHARE_ALL_TEXT = "Pick the items to share. The recipient must already have an Adulting Life account (their email)."
function shareAllDlg(v: V, at: number, done: boolean) {
  const w = Math.min(672, v.W - 32)
  const headH = 24 + wrapLines("Share Planner items with someone", w - 48, 10.5) * 28 + 4 + tl(SHARE_ALL_TEXT, w - 48) + 16 + 1
  let bodyH = 16 + 32 + 12
  SHAREABLE.forEach(([, list], g) => { bodyH += (g ? 16 : 0) + 15 + 6 + list.length * 32 + (list.length - 1) * 4 })
  if (done) bodyH += 16 + 44
  bodyH += 16
  const h = headH + bodyH + 1 + 72
  const r = centred(v, at, 672, h)
  const fy = r.y + r.h - 16 - 40
  const share = { x: r.x + r.w - 24 - 84, y: fy, w: 84, h: 40 }
  const cancel = { x: share.x - 8 - 70, y: fy, w: 70, h: 40 }
  const email = { x: r.x + 24, y: fy, w: cancel.x - 8 - r.x - 24, h: 40 }
  return { r, headH, share, cancel, email, list: { x: r.x + 24, y: r.y + headH + 16 + 44, w: r.w - 48, h: bodyH - 16 - 44 - 16 - (done ? 60 : 0) } }
}
function ShareAllDialog({ v, at, h, done }: { v: V; at: number; h: number; done?: boolean }) {
  const d = shareAllDlg(v, at, !!done)
  const total = SHAREABLE.reduce((a, [, l]) => a + l.length, 0)
  return (
    <>
      <Dim h={h} />
      <Box {...d.r} className="overflow-hidden rounded-2xl bg-white shadow-lg">
        <div className="border-b border-tal-line px-6 pb-4 pt-6">
          <h3 className="font-display text-lg leading-7 text-tal-plum">Share Planner items with someone</h3>
          <p className="mt-1 text-sm leading-5 text-tal-plum-soft">{SHARE_ALL_TEXT}</p>
        </div>
        <div className="px-6 py-4">
          <div className="mb-3 flex items-center gap-2 text-sm">
            <span className="flex h-8 items-center rounded-lg border border-tal-line px-3 text-tal-plum opacity-40">Check all</span>
            <span className="flex h-8 items-center rounded-lg border border-tal-line px-3 text-tal-plum">Uncheck all</span>
            <span className="ml-auto text-xs text-tal-plum-soft">{total} of {total} selected</span>
          </div>
          <div className="space-y-4">
            {SHAREABLE.map(([g, list]) => (
              <div key={g}>
                <div className="mb-1.5 text-[10px] font-semibold uppercase leading-[15px] tracking-widest text-tal-plum-soft">{g}</div>
                <ul className="space-y-1">
                  {list.map((it) => (
                    <li key={it} className="flex h-8 items-center gap-2 rounded-lg px-2">
                      <span className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[3px] bg-blue-600 text-white"><TickIcon size={10} /></span>
                      <span className="flex-1 text-sm text-tal-plum">{it}</span>
                      {done && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-emerald-700">Shared</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {done && <div className="mt-4 rounded-lg bg-tal-cream-soft p-3 text-sm leading-5 text-tal-plum">Shared {total} of {total}.</div>}
        </div>
      </Box>
      <Box x={d.r.x} y={d.email.y - 16} w={d.r.w} h={1} className="bg-tal-line" />
      <Box {...d.email} className="flex items-center overflow-hidden whitespace-nowrap rounded-xl border border-tal-line bg-white px-3 text-sm">
        {done ? "emma.clarke@example.com" : <Typed text="emma.clarke@example.com" delay={1200} speed={45} />}
      </Box>
      <Box {...d.cancel} className="flex items-center justify-center rounded-xl text-sm text-tal-plum">{done ? "Close" : "Cancel"}</Box>
      <DarkBtn r={d.share} className={`rounded-xl ${done ? "opacity-60" : ""}`}>Share {total}</DarkBtn>
    </>
  )
}

// confirm-dialog from Restart Setup guide.
const SETUP_BODY = "This won't delete any of your actual data, just resets your progress through the guide."
function setupDlg(v: V, at: number) {
  const w = Math.min(384, v.W - 32)
  const h = 20 + 50 + 8 + tl(SETUP_BODY, w - 40) + 20 + 40 + 20
  const r = centred(v, at, 384, h)
  const ok = { x: r.x + r.w - 20 - 90, y: r.y + r.h - 20 - 40, w: 90, h: 40 }
  return { r, ok, cancel: { x: ok.x - 8 - 82, y: ok.y, w: 82, h: 40 } }
}
function SetupConfirm({ v, at, h }: { v: V; at: number; h: number }) {
  const d = setupDlg(v, at)
  return (
    <>
      <Dim h={h} k="bg-black/50" />
      <Box {...d.r} className="rounded-2xl bg-white p-5 text-tal-plum shadow-xl">
        <h2 className="font-display text-lg leading-[25px]">Restart the Setup guide from the beginning?</h2>
        <p className="mt-2 text-sm leading-5 text-tal-plum-soft">{SETUP_BODY}</p>
      </Box>
      <Box {...d.cancel} className="flex items-center justify-center rounded-xl border border-tal-line text-sm">Cancel</Box>
      <DarkBtn r={d.ok} className="rounded-xl">Restart</DarkBtn>
    </>
  )
}

// AppPinSection's PinDialog (max-w-xs, rounded-3xl, p-6).
function pinDlg(v: V, at: number) {
  const r = centred(v, at, 320, 432)
  const kw = (320 - 48 - 24) / 3
  const key = (n: number) => { // 1-9, then 10 = backspace, 11 = 0, 12 = Cancel
    const k = n - 1
    return { x: r.x + 24 + (k % 3) * (kw + 12), y: r.y + 148 + Math.floor(k / 3) * 68, w: kw, h: 56 }
  }
  return { r, key, dots: { x: r.x + 24, y: r.y + 116, w: 272, h: 14 } }
}
function PinDialog({ v, at, h, step, dots }: { v: V; at: number; h: number; step: 1 | 2; dots: number }) {
  const d = pinDlg(v, at)
  return (
    <>
      <Dim h={h} k="bg-black/60" />
      <Box {...d.r} className="rounded-3xl bg-white shadow-2xl" />
      <Box x={d.r.x + 24} y={d.r.y + 24} w={272} h={70} className="text-center">
        <h3 className="font-display text-lg leading-tight text-tal-plum">{step === 1 ? "Enter a new 4-digit PIN" : "Confirm your PIN"}</h3>
        <p className="mt-1 text-xs text-tal-plum-soft">You&apos;ll be asked for this every time you open the app.</p>
      </Box>
      <Box {...d.dots} className="flex items-center justify-center gap-3">
        {[0, 1, 2, 3].map((i) => <span key={i} className={`inline-block h-3.5 w-3.5 rounded-full ${i < dots ? "bg-tal-plum" : "border border-tal-line bg-tal-cream-soft"}`} />)}
      </Box>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <Box key={n} {...d.key(n)} className="flex items-center justify-center rounded-2xl bg-tal-cream-soft text-2xl font-semibold text-tal-plum">{n}</Box>)}
      <Box {...d.key(10)} className={`flex items-center justify-center rounded-2xl bg-white text-tal-plum-soft ${dots === 0 ? "opacity-40" : ""}`}><BackspaceIcon /></Box>
      <Box {...d.key(11)} className="flex items-center justify-center rounded-2xl bg-tal-cream-soft text-2xl font-semibold text-tal-plum">0</Box>
      <Box {...d.key(12)} className="flex items-center justify-center rounded-2xl bg-white text-xs font-medium text-tal-plum-soft">Cancel</Box>
    </>
  )
}

// MicHelpDialog - the steps for the detected browser.
const MIC_TABS = ["iPhone / iPad", "Android", "Chrome", "Safari (Mac)", "Edge", "Firefox"]
const MIC_STEPS: Record<"ios" | "chrome", { steps: ReactNode[]; tip: ReactNode }> = {
  ios: {
    steps: [
      <>Open the <b>Settings</b> app on your iPhone or iPad.</>,
      <>Scroll down and tap <b>Safari</b>.</>,
      <>Under <b>Settings for Websites</b>, tap <b>Microphone</b>.</>,
      <>Find <b>theadultinglife.com.au</b> in the list and tap <b>Allow</b>.</>,
      <>Come back to Safari and reload the page — you may see a fresh &ldquo;Allow&rdquo; prompt at the top of the screen. Tap <b>Allow</b>.</>,
    ],
    tip: <>If you don&apos;t see us in the list yet, just start recording once — iOS will ask &ldquo;Allow theadultinglife.com.au to access the microphone?&rdquo; and you tap <b>Allow</b>.</>,
  },
  chrome: {
    steps: [
      <>Click the small icon on the far left of the address bar (a <b>lock</b>, <b>sliders</b>, or <b>&ldquo;View site information&rdquo;</b> icon).</>,
      <>Click <b>Site settings</b> in the dropdown.</>,
      <>Find <b>Microphone</b> in the list and change it to <b>Allow</b>.</>,
      <>Close the settings tab and reload our page.</>,
    ],
    tip: <>Or go straight to <code className="rounded bg-tal-cream-soft px-1 text-[11px]">chrome://settings/content/microphone</code> in a new tab and manage the &ldquo;Allowed to use your microphone&rdquo; list.</>,
  },
}
function micDlg(v: V, at: number) {
  const h = v.phone ? 640 : 600
  const r = centred(v, at, 512, h)
  return { r, ok: { x: r.x + r.w - 20 - 84, y: r.y + r.h - 12 - 40, w: 84, h: 40 }, tabs: { x: r.x, y: r.y + (v.phone ? 120 : 76), w: r.w, h: 52 } }
}
function MicDialog({ v, at, h }: { v: V; at: number; h: number }) {
  const d = micDlg(v, at)
  const which = v.phone ? "ios" : "chrome"
  const active = v.phone ? "iPhone / iPad" : "Chrome"
  return (
    <>
      <Dim h={h} k="bg-black/60" />
      <Box {...d.r} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-tal-line bg-tal-cream-soft px-5 py-4" style={{ height: v.phone ? 120 : 76 }}>
          <div className="min-w-0">
            <h2 className="font-display text-lg leading-tight text-tal-plum">How to enable your microphone</h2>
            <p className="mt-0.5 text-xs text-tal-plum-soft">Pick your device or browser for step-by-step instructions.</p>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tal-plum-soft"><CloseIcon /></span>
        </div>
        <div className="flex h-[52px] shrink-0 items-center gap-1 overflow-hidden whitespace-nowrap border-b border-tal-line px-4 text-xs">
          {MIC_TABS.map((t) => <span key={t} className={`inline-flex h-8 items-center rounded-full px-3 font-medium ${t === active ? "bg-tal-plum text-white shadow-sm" : "text-tal-plum-soft"}`}>{t}</span>)}
        </div>
        <div className="flex-1 overflow-hidden px-5 py-4">
          <ol className="space-y-3 text-sm text-tal-plum">
            {MIC_STEPS[which].steps.map((s, k) => (
              <li key={k} className="flex items-start gap-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tal-plum text-[11px] font-bold text-white">{k + 1}</span>
                <span className="flex-1 leading-relaxed">{s}</span>
              </li>
            ))}
            <li className="mt-2 rounded-lg border border-tal-line bg-tal-cream-soft/70 px-3 py-2 text-xs leading-relaxed text-tal-plum-soft"><span className="font-medium text-tal-plum">Tip:</span> {MIC_STEPS[which].tip}</li>
          </ol>
        </div>
        <div className="h-16 shrink-0 border-t border-tal-line" />
      </Box>
      <DarkBtn r={d.ok}>Got it</DarkBtn>
    </>
  )
}

// ── Security & Privacy (security/page.tsx) ──────────────────────────────────

const INFO = [
  { tone: "emerald", icon: <LockIcon />, t: "Encrypted in storage", b: "Everything you upload — documents, photos, form entries — is stored on managed infrastructure and encrypted at rest. Files and records sit behind per-user access rules, so another account can't reach into yours." },
  { tone: "violet", icon: <EyeIcon />, t: "Only you (and who you invite)", b: "Your family group starts with just you. If you add family members, you choose who is a member and what they can see. No one at The Adulting Life reads your records." },
  { tone: "sky", icon: <CloudIcon />, t: "Backed up automatically", b: "Data is backed up by our infrastructure provider so an accidental loss on your device doesn't mean losing your records. You can also print or export an emergency page anytime." },
  { tone: "amber", icon: <KeyIcon />, t: "You stay in control", b: "You sign in with Google, Microsoft or Apple, and only your app PIN or Face ID opens the app. Delete individual records at any time, and if you want to leave, you can download everything and delete your account." },
] as const
const TONE_BG: Record<string, [string, string]> = {
  emerald: ["bg-emerald-50 ring-emerald-100", "bg-emerald-100 text-emerald-700"],
  violet: ["bg-violet-50 ring-violet-100", "bg-violet-100 text-violet-700"],
  sky: ["bg-sky-50 ring-sky-100", "bg-sky-100 text-sky-700"],
  amber: ["bg-amber-50 ring-amber-100", "bg-amber-100 text-amber-700"],
}
const QUICK = [
  { t: "PIN, Face ID & account settings", b: "Change your app PIN, Face ID and your details." },
  { t: "Emergency page (print or share)", b: "One page with everything a paramedic or trusted person needs." },
]
const SEC_FOOT = "We're building this app with security as the top priority. As we add features (e.g. the Domestic Violence vault), each will get its own stricter access layer."

function secLayout(v: V) {
  const crumb = { x: v.x, y: v.top, w: v.phone ? 330 : 360, h: 20 }
  const subW = v.phone ? v.w - 40 - 2 - 52 : v.w - 40 - 52
  const hdr = { x: v.x, y: v.top + 32, w: v.w, h: 32 + 32 + tl("How your information is protected — and what stays under your control.", subW) + 2 }
  let y = hdr.y + hdr.h + 24
  const cols = v.phone ? 1 : 2
  const cw = cols === 1 ? v.w : (v.w - 16) / 2
  const cards: Rect[] = []
  for (let r = 0; r < INFO.length / cols; r++) {
    const row = INFO.slice(r * cols, r * cols + cols)
    const h = Math.max(...row.map((c) => 40 + Math.max(40, 4 + wrapLines(c.t, cw - 92, 10.5) * 23) + 8 + tlr(c.b, cw - 40)))
    row.forEach((_, k) => cards.push({ x: v.x + k * (cw + 16), y, w: cw, h }))
    y += h + 16
  }
  y += 24 - 16
  const qTop = y
  const qw = v.phone ? v.w - 48 : (v.w - 48 - 12) / 2
  const qh = Math.max(...QUICK.map((q) => 32 + 24 + 4 + tlx(q.b, qw - 32) + 2))
  const quick: Rect[] = QUICK.map((_, k) => v.phone
    ? { x: v.x + 24, y: qTop + 24 + 28 + 12 + k * (qh + 12), w: qw, h: qh }
    : { x: v.x + 24 + k * (qw + 12), y: qTop + 24 + 28 + 12, w: qw, h: qh })
  const qBox = { x: v.x, y: qTop, w: v.w, h: quick[quick.length - 1].y + qh + 24 - qTop }
  const foot = { x: v.x, y: qBox.y + qBox.h + 24, w: v.w, h: tlx(SEC_FOOT, v.w) }
  return { crumb, hdr, cards, quick, qBox, foot, h: Math.max(v.H, foot.y + foot.h + 40) }
}

function Security({ v, fabs }: { v: V; fabs?: boolean }) {
  const L = secLayout(v)
  return (
    <Shell v={v} h={L.h} nav={-1}>
      <Box {...L.crumb} className="flex items-center gap-2 text-sm text-tal-plum-soft">The Adulting Life Organiser<span className="text-tal-plum-soft/50">/</span>Security &amp; Privacy</Box>
      <Box {...L.hdr} className="flex items-center gap-3 rounded-2xl border border-tal-line bg-tal-cream-soft px-5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><ShieldIcon /></span>
        <div>
          <div className="font-display text-2xl leading-8 text-tal-plum">Security &amp; Privacy</div>
          <p className="text-sm leading-5 text-tal-plum-soft">How your information is protected — and what stays under your control.</p>
        </div>
      </Box>
      {INFO.map((c, k) => (
        <Box key={c.t} {...L.cards[k]} className={`rounded-2xl p-5 ring-1 ${TONE_BG[c.tone][0]}`}>
          <div className="mb-2 flex items-start gap-3">
            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_BG[c.tone][1]}`}>{c.icon}</span>
            <h3 className="mt-1 font-display text-lg leading-tight text-tal-plum">{c.t}</h3>
          </div>
          <p className="text-sm leading-relaxed text-tal-plum-soft">{c.b}</p>
        </Box>
      ))}
      <Box {...L.qBox} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={L.qBox.x + 24} y={L.qBox.y + 24} w={300} h={28} className="font-display text-xl leading-7 text-tal-plum">Quick actions</Box>
      {QUICK.map((q, k) => (
        <Box key={q.t} {...L.quick[k]} className="rounded-xl border border-tal-line bg-tal-cream-soft/40 p-4">
          <div className="font-medium leading-6 text-tal-plum">{q.t}</div>
          <p className="mt-1 text-xs leading-4 text-tal-plum-soft">{q.b}</p>
        </Box>
      ))}
      <Box {...L.foot} className="text-xs leading-4 text-tal-plum-soft">{SEC_FOOT}</Box>
      {fabs && <Fabs {...FAB(v)} />}
    </Shell>
  )
}

// ── The Emergency page it links to (top of emergency/page.tsx) ──────────────

const EM_CONTACTS: { who: string; f: [string, string][] }[] = [
  { who: "Sarah Taylor", f: [["Full Name", "Emma Clarke"], ["Relationship", "Sister"], ["Priority", "primary"], ["Phone Number", "0423 555 274"], ["Email Address", "emma.clarke@example.com"]] },
  { who: "James Taylor", f: [["Full Name", "Sarah Taylor"], ["Relationship", "Wife"], ["Priority", "primary"], ["Phone Number", "0412 555 301"]] },
]
function emLayout(v: V) {
  const crumb = { x: v.x, y: v.top, w: 300, h: 20 }
  const red = { x: v.x, y: v.top + 32, w: v.w, h: v.phone ? 146 : 96 }
  const count = { x: v.x, y: red.y + red.h + 12, w: v.w, h: 20 }
  const card = { x: v.x, y: count.y + 20 + 24, w: v.w, h: v.H }
  return { crumb, red, count, card }
}
function Emergency({ v }: { v: V }) {
  const L = emLayout(v)
  return (
    <Shell v={v} h={v.H} nav={NAV_EMERGENCY}>
      <Box {...L.crumb} className="flex items-center gap-2 text-sm text-tal-plum-soft">Dashboard<span className="text-tal-plum-soft/50">/</span>Emergency</Box>
      <Box {...L.red} className="rounded-2xl bg-red-600 px-5 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">{ICONS.emergency}</span>
          <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">In case of emergency</span>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-tal-line bg-white px-2 text-sm text-tal-plum"><PdfIcon />{!v.phone && "Download PDF"}</span>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-tal-line bg-white px-2 text-sm text-tal-plum"><MailIcon />{!v.phone && "Share PDF"}</span>
          {!v.phone && <span className="inline-flex h-8 items-center rounded-xl bg-white/15 px-3 text-xs font-medium">Excel</span>}
        </div>
        <h1 className="mt-2 font-display text-xl leading-tight">Everything a paramedic, hospital or trusted person might need</h1>
      </Box>
      <Box {...L.count} className="text-sm text-tal-plum-soft">13 records across 4 family members</Box>
      <Box {...L.card} className="overflow-hidden rounded-2xl border border-tal-line bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-tal-line bg-tal-cream-soft/50 px-5 py-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white">{ICONS.folder}</span>
          <h2 className="font-display text-lg text-tal-plum">Emergency contacts</h2>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-violet-800">3</span>
          <span className="ml-auto text-xs text-tal-plum-soft">Edit →</span>
        </div>
        {EM_CONTACTS.map((r) => (
          <div key={r.who} className="border-b border-tal-line p-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-3"><span className="font-medium text-tal-plum">{r.f[0][1]}</span><span className="text-xs text-tal-plum-soft">{r.who}</span></div>
            <dl className={`grid gap-x-4 gap-y-0.5 text-sm ${v.phone ? "grid-cols-1" : "grid-cols-[max-content_1fr]"}`}>
              {r.f.map(([l, val]) => <div key={l} className="contents"><dt className="text-tal-plum-soft">{l}</dt><dd className="text-tal-plum">{val}</dd></div>)}
            </dl>
          </div>
        ))}
      </Box>
    </Shell>
  )
}

// ── Screens and steps (shared by both versions) ──────────────────────────────

const BASE = "app.theadultinglife.com.au"
const U = { set: `${BASE}/settings`, sec: `${BASE}/security`, em: `${BASE}/emergency` }

// Settings states, in the order they happen.
const S0: St = {}
const S_WORK: St = { exp: "working" }
const S_DONE: St = { exp: "done" }
const S_GRANT: St = { ...S_DONE, granted: true }
const S_SWIPE: St = { ...S_GRANT, tableX: 166 }
const S_REV: St = { ...S_SWIPE, revoked: true }
const S_REV_D: St = { ...S_GRANT, revoked: true } // computer - no swipe
const S_AI = (v: V): St => ({ ...(v.phone ? S_REV : S_REV_D), aiReset: true })
const S_PIN = (v: V): St => ({ ...S_AI(v), pinNew: true })
const S_RM = (v: V): St => ({ ...S_PIN(v), removed: true })
const S_FADD = (v: V): St => ({ ...S_RM(v), faceAdded: true })
const S_TAB1 = (v: V): St => ({ ...S_FADD(v), tab: "android" })
const S_TAB2 = (v: V): St => S_TAB1(v)
const S_MENU = (v: V): St => ({ ...S_TAB2(v), priv: "menu" })
const S_FILLED = (v: V): St => ({ ...S_TAB2(v), priv: "filled" })
const S_SENT = (v: V): St => ({ ...S_TAB2(v), priv: "sent" })
const S_DEL = (v: V): St => ({ ...S_SENT(v), del: true })

function build(v: V): { screens: Record<string, ReactNode>; steps: WalkStep[] } {
  const P = v.phone
  const sc = (h: number, y: number) => Math.max(0, Math.min(h - v.H, Math.round(y - v.H * 0.4)))
  const fz = (r: Rect, s: number) => ({ x: P ? 195 : r.x + r.w / 2, y: r.y + r.h / 2, scale: P ? Math.min(s, 1.06) : s })
  const fzs = (r: Rect, s: number) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, scale: s })
  const L = (s: St) => setLayout(v, s)

  const l0 = L(S0), lw = L(S_WORK), ld = L(S_DONE), lg = L(S_GRANT), ls = L(S_SWIPE), lr = L(P ? S_REV : S_REV_D)
  const la = L(S_AI(v)), lp = L(S_PIN(v)), lrm = L(S_RM(v)), lfa = L(S_FADD(v))
  const lt1 = L(S_TAB1(v)), lt2 = L(S_TAB2(v)), lm = L(S_MENU(v)), lf = L(S_FILLED(v)), lsent = L(S_SENT(v)), ldel = L(S_DEL(v))
  const lsec = secLayout(v), lem = emLayout(v)
  const fab = FAB(v)

  // Scroll positions (and where the fixed pop-ups sit)
  const atTable = sc(ld.h, ld.sh.table.y + ld.sh.table.h / 2)
  const atPdf = sc(lr.h, lr.sh.table.y + 60)
  const atShareAll = sc(lr.h, lr.sh.box.y + 60)
  const atSetup = sc(la.h, la.setup.btn.y)
  const atPin = sc(la.h, la.pin.btn.y)
  const atMic = sc(lt2.h, lt2.mic.btn.y)
  const atPriv = sc(lm.h, lm.priv.select.y + 60)
  const atDel = sc(ldel.h, ldel.del.confirm.y + 40)

  const gm = shareModal(v, atTable, "grant"), rm = shareModal(v, atTable, "revoke")
  const ed = emailDlg(v, atPdf, false), es = emailDlg(v, atPdf, true)
  const sa = shareAllDlg(v, atShareAll, false), sad = shareAllDlg(v, atShareAll, true)
  const sd = setupDlg(v, atSetup), pd = pinDlg(v, atPin), md = micDlg(v, atMic)

  const screens: Record<string, ReactNode> = {
    set: <Settings v={v} s={S0} />,
    setWork: <Settings v={v} s={S_WORK} />,
    setZip: <Settings v={v} s={S_DONE}><ZipWindow v={v} /></Settings>,
    setMail: <Settings v={v} s={S_DONE}><ExportEmail v={v} /></Settings>,
    setDone: <Settings v={v} s={S_DONE} />,
    grantDlg: <Settings v={v} s={S_DONE}><ShareModal v={v} at={atTable} kind="grant" h={ld.h} /></Settings>,
    granted: <Settings v={v} s={S_GRANT} />,
    swiped: <Settings v={v} s={S_SWIPE} />,
    revokeDlg: <Settings v={v} s={P ? S_SWIPE : S_GRANT}><ShareModal v={v} at={atTable} kind="revoke" h={lg.h} /></Settings>,
    revoked: <Settings v={v} s={P ? S_REV : S_REV_D} />,
    emailDlg: <Settings v={v} s={P ? S_REV : S_REV_D}><EmailDialog v={v} at={atPdf} h={lr.h} /></Settings>,
    emailSent: <Settings v={v} s={P ? S_REV : S_REV_D}><EmailDialog v={v} at={atPdf} h={lr.h} sent /></Settings>,
    shareAll: <Settings v={v} s={P ? S_REV : S_REV_D}><ShareAllDialog v={v} at={atShareAll} h={lr.h} /></Settings>,
    shareAllDone: <Settings v={v} s={P ? S_REV : S_REV_D}><ShareAllDialog v={v} at={atShareAll} h={lr.h} done /></Settings>,
    aiReset: <Settings v={v} s={S_AI(v)} />,
    setupDlg: <Settings v={v} s={S_AI(v)}><SetupConfirm v={v} at={atSetup} h={la.h} /></Settings>,
    pin1: <Settings v={v} s={S_AI(v)}><PinDialog v={v} at={atPin} h={la.h} step={1} dots={3} /></Settings>,
    pin2: <Settings v={v} s={S_AI(v)}><PinDialog v={v} at={atPin} h={la.h} step={2} dots={3} /></Settings>,
    pinSet: <Settings v={v} s={S_PIN(v)} />,
    faceRm: <Settings v={v} s={S_RM(v)} />,
    faceAdded: <Settings v={v} s={S_FADD(v)} />,
    tab1: <Settings v={v} s={S_TAB1(v)} />,
    micDlg: <Settings v={v} s={S_TAB2(v)}><MicDialog v={v} at={atMic} h={lt2.h} /></Settings>,
    privMenu: <Settings v={v} s={S_MENU(v)} />,
    privFilled: <Settings v={v} s={S_FILLED(v)} />,
    privSent: <Settings v={v} s={S_SENT(v)} />,
    delOpen: <Settings v={v} s={S_DEL(v)} />,
    sec: <Security v={v} />,
    em: <Emergency v={v} />,
    secFabs: <Security v={v} fabs />,
  }

  const sh = ld.sh
  const iJames = 0, iEmma = 1, rHome = 0, rWill = 1
  const sTable = atTable
  const tableFocus = (lay: SL) => P ? { x: 195, y: lay.sh.table.y + lay.sh.table.h / 2, scale: 1.04 } : { x: 720, y: lay.sh.table.y + lay.sh.table.h / 2, scale: 1.2 }
  const pinKey = (n: number) => mid(pd.key(n))
  const sF = (lay: SL, r: Rect) => sc(lay.h, r.y + r.h / 2)

  const steps: WalkStep[] = [
    // The page
    { screen: "set", url: U.set, caption: "Settings: your account", detail: P ? "Open it from the ☰ menu. Everything about your account, top to bottom - your download, sharing, AI, PIN and Face ID, privacy." : "Open it from Settings in the sidebar. Everything about your account, top to bottom - your download, sharing, AI, PIN and Face ID, privacy.", focus: fz(l0.hdr, 1.3), ring: l0.hdr, duration: 7000 },
    // Download your organiser
    { screen: "set", url: U.set, caption: "Download your organiser", detail: "Everything in your family's organiser in one go - a PDF laid out like the Organiser, an Excel workbook, and every document, scan and receipt photo. Download complete organiser builds it.", focus: fz(l0.dl.box, 1.2), ring: pad(l0.dl.btn, 3), click: mid(l0.dl.btn), duration: 8000 },
    { screen: "setWork", url: U.set, caption: "Preparing your download…", detail: "A minute or two with lots of documents. The link is emailed to you as well, so it's fine to leave the page.", focus: fz(span(lw.dl.btn, lw.dl.status!), 1.4), ring: pad(span(lw.dl.btn, lw.dl.status!), 4), duration: 6500 },
    { screen: "setZip", url: U.set, caption: "One .zip with all of it", detail: "My Organiser.pdf, My Organiser.xlsx (a tab for every folder), and a Documents folder sorted by section and folder - receipt photos by financial year.", focus: P ? { x: 195, y: zipRect(v).y + zipRect(v).h / 2, scale: 1.04 } : { x: 900, y: 330, scale: 1.3 }, ring: zipRect(v), duration: 9000 },
    { screen: "setMail", url: U.set, caption: "And the link is emailed to you", detail: "\"Your organiser download is ready\" - to sarah.taylor@example.com. The link works for 24 hours; after that, download it again from Settings.", focus: P ? { x: 195, y: mailRect(v).y + mailRect(v).h / 2, scale: 1.04 } : { x: 890, y: 300, scale: 1.3 }, ring: mailRect(v), duration: 8500 },
    { screen: "setDone", url: U.set, caption: "Download started", detail: "The size and how many documents, with a link in case it didn't start. Underneath: a technical backup (.json) for moving your data to another app - no documents in that one.", focus: fz(span(ld.dl.status!, ld.dl.foot), 1.3), ring: pad(span(ld.dl.status!, ld.dl.foot), 4), duration: 8000 },
    // What you've shared
    { screen: "setDone", url: U.set, scroll: sF(ld, sh.box), caption: "What you've shared", detail: "Every item you've shared down the side, and each person you've shared with across the top - James, and Emma, Sarah's sister and next of kin.", focus: tableFocus(ld), ring: sh.table, duration: 8000 },
    { screen: "setDone", url: U.set, scroll: sTable, caption: "A dash means no access", detail: "James can't see Sarah's Will & Funeral Instructions yet. Click the dash to give it to him.", focus: fzs(pad(sh.cell(rWill, iJames), 30), P ? 1.6 : 1.8), ring: pad(sh.cell(rWill, iJames), 3), click: mid(sh.cell(rWill, iJames)), duration: 6000 },
    { screen: "grantDlg", url: U.set, scroll: sTable, caption: "Grant access?", detail: "He'll see it in his Planner, and gets an email letting him know.", focus: { x: P ? 195 : 600, y: gm.r.y + gm.r.h / 2, scale: P ? 1.06 : 1.5 }, ring: pad(gm.ok, 3), click: mid(gm.ok), duration: 6500 },
    ...(P ? [{ screen: "swiped", url: U.set, scroll: sTable, caption: "Swipe the table sideways", detail: "On a phone the item names stay put while the people slide across - here's Emma's column.", focus: tableFocus(ls), ring: { x: ls.sh.table.x + ls.sh.itemW, y: ls.sh.table.y, w: ls.sh.table.w - ls.sh.itemW, h: ls.sh.table.h }, click: { x: 300, y: ls.sh.table.y + 50 }, duration: 6500 } as WalkStep] : []),
    { screen: P ? "swiped" : "granted", url: U.set, scroll: sTable, caption: "Click view to take access away", detail: "James now has a green view on the Will. And Emma doesn't need the home insurance any more.", focus: fzs(pad((P ? ls : lg).sh.cell(rHome, iEmma), 30), P ? 1.6 : 1.8), ring: pad((P ? ls : lg).sh.cell(rHome, iEmma), 3), click: mid((P ? ls : lg).sh.cell(rHome, iEmma)), duration: 6500 },
    { screen: "revokeDlg", url: U.set, scroll: sTable, caption: "Revoke access?", detail: "Emma will lose access to Home Insurance details. You can grant access again any time.", focus: { x: P ? 195 : 600, y: rm.r.y + rm.r.h / 2, scale: P ? 1.06 : 1.5 }, ring: pad(rm.ok, 3), click: mid(rm.ok), duration: 6500 },
    { screen: "revoked", url: U.set, scroll: sTable, caption: "Gone - a dash again", detail: "Each item's name opens it, too. To share with someone who isn't in the table yet, open the item and use its own Share button.", focus: tableFocus(lr), ring: span(lr.sh.itemRect(rHome), lr.sh.cell(rHome, iEmma)), duration: 7500 },
    // Each person's PDF
    { screen: "revoked", url: U.set, scroll: atPdf, caption: "What each person can see, as a PDF", detail: P ? "Under each name: the PDF icon downloads it, the envelope emails it." : "Under each name: Download PDF saves it, Share PDF emails it.", focus: fzs(pad(span(lr.sh.pdfBtn(iEmma), lr.sh.shareBtn(iEmma)), 20), P ? 1.6 : 1.7), ring: pad(span(lr.sh.pdfBtn(iEmma), lr.sh.shareBtn(iEmma)), 3), click: mid(lr.sh.shareBtn(iEmma)), duration: 6500 },
    { screen: "emailDlg", url: U.set, scroll: atPdf, caption: "Share by email", detail: "\"What you have shared with Emma Clarke (PDF)\" - her email, a message if you like, then Send.", focus: { x: P ? 195 : 600, y: ed.r.y + ed.r.h / 2, scale: P ? 1.06 : 1.35 }, ring: pad(ed.to, 3), click: mid(ed.send), duration: 8000 },
    { screen: "emailSent", url: U.set, scroll: atPdf, caption: "Sent - the PDF is attached", detail: "It comes from The Adulting Life with Sarah's name on it; replies go to her email.", focus: { x: P ? 195 : 600, y: es.r.y + es.r.h / 2, scale: P ? 1.06 : 1.5 }, ring: es.r, click: mid(es.done), duration: 6000 },
    // Share all with…
    { screen: "revoked", url: U.set, scroll: atShareAll, caption: "Share all with…", detail: "Share a batch of Peace of Mind Planner items with someone in one go.", focus: fzs(pad(lr.sh.shareAll, 30), P ? 1.6 : 1.7), ring: pad(lr.sh.shareAll, 3), click: mid(lr.sh.shareAll), duration: 5500 },
    { screen: "shareAll", url: U.set, scroll: atShareAll, caption: "Pick the items, then their email", detail: "Everything's ticked to start - Check all / Uncheck all, or untick what you'd rather keep. They need their own Adulting Life account.", focus: { x: P ? 195 : 600, y: sa.r.y + sa.r.h / 2, scale: P ? 1.04 : 1.1 }, ring: pad(sa.email, 3), click: mid(sa.share), duration: 8500 },
    { screen: "shareAllDone", url: U.set, scroll: atShareAll, caption: "Shared 5 of 5", detail: "Each item says Shared. Close, and they're in the table above.", focus: { x: P ? 195 : 600, y: sad.r.y + sad.r.h / 2, scale: P ? 1.04 : 1.1 }, ring: pad(sad.list, 4), click: mid(sad.cancel), duration: 6000 },
    // AI and your data
    { screen: "revoked", url: U.set, scroll: sF(lr, lr.ai.box), caption: "AI and your data", detail: "Only the thing you're working on goes to the AI, only with your OK, and it isn't kept or used for training. You can always type things in yourself.", focus: fz(lr.ai.box, 1.15), ring: lr.ai.box, duration: 8500 },
    { screen: "revoked", url: U.set, scroll: sF(lr, lr.ai.btn), caption: "Reset AI consents", detail: "Changed your mind? Each AI feature asks again next time you use it - the button says \"Reset — will ask again\".", focus: fzs(pad(lr.ai.btn, 30), P ? 1.6 : 1.7), ring: pad(lr.ai.btn, 3), click: mid(lr.ai.btn), duration: 6000 },
    // Setup guide
    { screen: "aiReset", url: U.set, scroll: atSetup, caption: "Setup guide", detail: "Start the Setup guide over. Only your progress through it resets - your records stay exactly where they are.", focus: fz(la.setup.box, 1.25), ring: pad(la.setup.btn, 3), click: mid(la.setup.btn), duration: 6500 },
    { screen: "setupDlg", url: U.set, scroll: atSetup, caption: "It checks first", detail: "Restart takes you back through the guide from the dashboard. Cancel keeps where you're up to - we'll cancel.", focus: { x: P ? 195 : 600, y: sd.r.y + sd.r.h / 2, scale: P ? 1.06 : 1.5 }, ring: pad(span(sd.cancel, sd.ok), 3), click: mid(sd.cancel), duration: 6500 },
    // App PIN
    { screen: "aiReset", url: U.set, scroll: atPin, caption: "App PIN", detail: "A 4-digit lock each time you open the app and after 15 minutes idle. You sign in once with Google, Apple or Microsoft - the PIN unlocks this device. Change PIN to pick a new one.", focus: fz(la.pin.box, 1.15), ring: pad(la.pin.btn, 3), click: mid(la.pin.btn), duration: 8500 },
    { screen: "pin1", url: U.set, scroll: atPin, caption: "Enter a new 4-digit PIN", detail: "Tap four numbers. Cancel, bottom right, leaves it as it was.", focus: { x: P ? 195 : 600, y: pd.r.y + pd.r.h / 2, scale: P ? 1.06 : 1.3 }, ring: pad(pd.dots, 6), click: pinKey(8), duration: 6000 },
    { screen: "pin2", url: U.set, scroll: atPin, caption: "Confirm your PIN", detail: "The same four again (if they don't match it says so). Then it's saved - \"Set 23 Nov 2026\" - and we email you that it changed, in case it wasn't you.", focus: { x: P ? 195 : 600, y: pd.r.y + pd.r.h / 2, scale: P ? 1.06 : 1.3 }, ring: pad(pd.dots, 6), click: pinKey(8), duration: 7500 },
    // Face ID
    { screen: "pinSet", url: U.set, scroll: sF(lp, lp.face.box), caption: "Face ID", detail: "Unlock with your face or fingerprint instead of the PIN - your device checks it; The Adulting Life never sees or stores it. Each phone or computer it's on is listed. Remove the old iPad, last used in June.", focus: fz(lp.face.box, 1.15), ring: pad(lp.face.removes[1], 3), click: mid(lp.face.removes[1]), duration: 9000 },
    { screen: "faceRm", url: U.set, scroll: sF(lrm, lrm.face.btn), caption: `Turn on ${faceName(v)} for this device`, detail: P ? "Now this iPhone: \"Waiting for your device…\" while it asks for your face - look at it and it's on." : "Now this Mac: \"Waiting for your device…\" while it asks for your fingerprint - touch the sensor and it's on.", focus: fzs(pad(lrm.face.btn, 30), P ? 1.5 : 1.6), ring: pad(lrm.face.btn, 3), click: mid(lrm.face.btn), duration: 6500 },
    { screen: "faceAdded", url: U.set, scroll: sF(lfa, lfa.face.list), caption: "Turned on 23 Nov 2026", detail: "Next time the app locks, unlock with Face ID. Your PIN still works too.", focus: fz(lfa.face.list, 1.3), ring: pad(lfa.face.list, 3), duration: 6000 },
    // Tours
    { screen: "faceAdded", url: U.set, scroll: sF(lfa, lfa.tours.box), caption: "Interactive tours", detail: "Take the tour again replays the guided tour of the whole app from the dashboard. Replay Planner tour is a 5-step one inside the Peace of Mind Planner. Nothing changes.", focus: fz(lfa.tours.box, 1.2), ring: pad(span(lfa.tours.b1, lfa.tours.b2), 3), click: mid(lfa.tours.b1), duration: 8000 },
    // Install
    { screen: "faceAdded", url: U.set, scroll: sF(lfa, lfa.install.box), caption: "Install on your phone", detail: P ? "Put the app on your home screen. It picks your device - iPhone / iPad - and shows the steps. Another device? Pick it." : "Put the app on your home screen. It picks your device - Desktop here - and shows the steps. Another device? Pick it.", focus: fz(lfa.install.box, 1.15), ring: pad(lfa.install.tabs.android, 2), click: mid(lfa.install.tabs.android), duration: 8000 },
    { screen: "tab1", url: U.set, scroll: sF(lt1, lt1.install.box), caption: "Android", detail: P ? "Chrome's ⋮ menu, then Install app. Desktop shows the computer steps." : "Chrome's ⋮ menu, then Install app. iPhone / iPad shows Safari's Share, then Add to Home Screen.", focus: fz(lt1.install.steps, 1.3), ring: pad(lt1.install.steps, 3), duration: 6500 },
    // Microphone
    { screen: "tab2", url: U.set, scroll: atMic, caption: "Microphone & voice input", detail: "Every Notes field has a microphone. If it isn't working, this shows how to allow it.", focus: fz(lt2.mic.box, 1.25), ring: pad(lt2.mic.btn, 3), click: mid(lt2.mic.btn), duration: 6000 },
    { screen: "micDlg", url: U.set, scroll: atMic, caption: "How to enable your microphone", detail: P ? "Step by step for your device - iPhone / iPad here. Tabs for Android and each browser too. Got it closes it." : "Step by step for your browser - Chrome here. Tabs for iPhone, Android, Safari, Edge and Firefox too. Got it closes it.", focus: { x: P ? 195 : 600, y: md.r.y + md.r.h / 2, scale: P ? 1.04 : 1.15 }, ring: md.tabs, click: mid(md.ok), duration: 8000 },
    // Privacy requests
    { screen: "privMenu", url: U.set, scroll: atPriv, caption: "Privacy requests", detail: "For anything you need us to do: access, correct, export or delete your information, or a privacy complaint.", focus: fz(lm.priv.box, 1.15), ring: pad({ x: lm.priv.select.x, y: lm.priv.select.y + 48, w: P ? lm.iw : 300, h: PRIV_KINDS.length * 34 + 8 }, 3), click: { x: lm.priv.select.x + 80, y: lm.priv.select.y + 48 + 4 + 34 + 17 }, duration: 7500 },
    { screen: "privFilled", url: U.set, scroll: atPriv, caption: "Tell us more, then Send request", detail: "It goes to info@theadultinglife.com.au, and we reply within 30 days.", focus: fz(lf.priv.form, 1.1), ring: pad(lf.priv.textarea, 3), click: mid(lf.priv.send), duration: 8000 },
    { screen: "privSent", url: U.set, scroll: sF(lsent, lsent.priv.sentBox!), caption: "Request sent.", detail: "Usually much sooner than 30 days. Send another starts a new one.", focus: fz(lsent.priv.sentBox!, 1.35), ring: pad(lsent.priv.sentBox!, 3), duration: 6000 },
    // Delete account
    { screen: "privSent", url: U.set, scroll: sF(lsent, lsent.del.box), caption: "Delete account", detail: "Signs you out straight away and deletes everything for your family after 30 days. Change your mind in that time - sign in and press Cancel deletion on the red banner - and nothing is lost.", focus: fz(lsent.del.box, 1.1), ring: pad(lsent.del.btn, 3), click: mid(lsent.del.btn), duration: 9500 },
    { screen: "delOpen", url: U.set, scroll: atDel, caption: "Type DELETE below to confirm", detail: "Permanently delete account only works once DELETE is typed. We'll Cancel instead.", focus: fz(ldel.del.confirm, 1.35), ring: pad(ldel.del.cancel, 3), click: mid(ldel.del.cancel), duration: 7000 },
    // Security & Privacy
    { screen: "sec", url: U.sec, caption: "Security & Privacy", detail: "How your information is protected. Open it from Secure & private or Always backed up on the Organiser page.", focus: fz(lsec.hdr, 1.3), ring: pad(span(lsec.crumb, lsec.hdr), 4), duration: 7000 },
    { screen: "sec", url: U.sec, scroll: P ? sc(lsec.h, lsec.cards[0].y + lsec.cards[0].h) : 0, caption: "Encrypted, and only who you invite", detail: "Stored encrypted, behind per-account access rules. Your family group starts with just you - you choose who's in it and what they see. No one at The Adulting Life reads your records.", focus: fz(span(lsec.cards[0], lsec.cards[1]), 1.1), ring: pad(span(lsec.cards[0], lsec.cards[1]), 4), duration: 9000 },
    { screen: "sec", url: U.sec, scroll: P ? sc(lsec.h, lsec.cards[2].y + lsec.cards[2].h) : 0, caption: "Backed up, and you stay in control", detail: "Backed up automatically. You sign in with Google, Microsoft or Apple, and only your app PIN or Face ID opens the app. Download everything, or leave, any time.", focus: fz(span(lsec.cards[2], lsec.cards[3]), 1.1), ring: pad(span(lsec.cards[2], lsec.cards[3]), 4), duration: 9000 },
    { screen: "sec", url: U.sec, scroll: sc(lsec.h, lsec.qBox.y + lsec.qBox.h / 2), caption: "Quick actions", detail: "PIN, Face ID & account settings opens Settings - the page you've just seen, where Change PIN and Face ID are.", focus: fz(lsec.qBox, 1.2), ring: pad(lsec.quick[0], 3), click: mid(lsec.quick[0]), duration: 6000 },
    { screen: "sec", url: U.sec, scroll: sc(lsec.h, lsec.qBox.y + lsec.qBox.h / 2), caption: "Emergency page (print or share)", detail: "", focus: fz(lsec.qBox, 1.2), ring: pad(lsec.quick[1], 3), click: mid(lsec.quick[1]), duration: 4500 },
    { screen: "em", url: U.em, caption: "In case of emergency", detail: "One page with everything a paramedic or trusted person needs - download or share it as a PDF.", focus: fz(span(lem.red, lem.count), 1.2), ring: pad(lem.red, 3), duration: 6500 },
    // Round buttons
    { screen: "secFabs", url: U.sec, caption: "Two round buttons", detail: "? opens help for this page. Tap the tour button any time to watch this again - you're watching it now.", focus: P ? { x: 270, y: 780, scale: 1.5 } : { x: 1050, y: 640, scale: 1.8 }, ring: { x: fab.right - 128, y: fab.y, w: 128, h: 56 }, click: { x: fab.right - 100, y: fab.y + 28 }, duration: 7000 },
  ]
  return { screens, steps }
}

const D = build(DV)
const PH = build(PV)

export default function SettingsPageWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  const b = phone ? PH : D
  return (
    <WalkthroughPlayer music="/audio/demo-music-upbeat.mp3" key={dev} device={dev} steps={b.steps} screens={b.screens}
      title={phone ? "Settings (phone)" : "Settings (computer)"} url={U.set} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "Settings & Security", subtitle: "Your download, your sharing, your PIN and Face ID - and what stays private" }} />
  )
}
