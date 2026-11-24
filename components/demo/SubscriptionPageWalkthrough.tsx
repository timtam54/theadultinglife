"use client"

// "Subscription" page walkthrough - the walkthrough (tour) button on
// /subscription (components/demo/PageWalkthroughFab). Hand-built copies of the
// real screens with a made-up family's sample data (the Taylors, Brisbane) -
// no sign-in, no API calls, no Stripe. "Today" is Mon 23 Nov 2026. Two
// versions (docs/Demo-Walkthroughs.md, rule 2):
//   computer - 1200 x 760, the sidebar + header layout (md and up)
//   phone    - 390 x 844, the mobile layout (header with logo, TAL AI, bell,
//              avatar, hamburger; single column)
// Covers both states of /subscription and every control on each:
//   not subscribed - Start TAL Premium (SubscribeConsentPanel): Monthly /
//   Annual, the price with GST, Billing, First charge, Next charge after that,
//   Cancel, Have a discount code? (adulting101 = first month free, and the
//   charge dates move), If you cancel, Start my free month / Subscribe -> the
//   Stripe card popup (StripeCardDialog: Card / Apple Pay / Google Pay, card
//   number, expiry, CVC, country - the live look, no yellow test-mode notice)
//   -> Processing… -> You're subscribed.
//   subscribed - the plan card (status badge, Started, Next billing date /
//   Free trial ends / Access ends, Payment method + Change card -> the popup in
//   update mode), Billing history (date, number, amount, status, View -> the
//   Stripe invoice page, PDF -> the invoice PDF), Danger zone -> Cancel
//   subscription -> Yes, cancel -> Cancelled + Changed your mind? -> Resume
//   subscription.
//   Then the two banners at the top of every page (components/
//   SubscriptionRequired): PaymentFailedBanner (7 days to update the card -
//   lib/subscription/access GRACE_DAYS) and ViewOnlyBanner (from 1 Dec 2026,
//   no subscription = view and download only).
// Copies: app/(app)/subscription/page.tsx (+ InvoiceHistory), components/
// SubscribeConsentPanel.tsx, StripeCardDialog.tsx (CardForm, done view),
// UpdateCardButton, CancelSubscriptionButton, ResumeSubscriptionButton,
// SubscriptionRequired.tsx (ViewOnlyBanner, PaymentFailedBanner, the
// "Subscribe to keep adding and editing" popup - described, not drawn) and the
// banner placement in app/(app)/layout.tsx. The Stripe-hosted invoice page and
// invoice PDF are Stripe's own pages, drawn approximately.
// The shell and round buttons are copied from SettingsPageWalkthrough.
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

// ── Icons (copied from nav-items.tsx and layout.tsx) ─────────────────────────

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
const NAV_SUB = 12
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
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const CardIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" /></svg>
)
const AppleIcon = () => (
  <svg width="18" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.4-.9-2.4-3.9ZM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4Z" /></svg>
)
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.6c-.2 1.3-1 2.4-2.1 3.1v2.6h3.4c2-1.8 3.1-4.5 3.1-7.6Z" /><path fill="#34A853" d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.7v2.7C4.4 19.8 8 22 12 22Z" /><path fill="#FBBC05" d="M6.2 13.6c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.3H2.7C2 8.7 1.6 10.3 1.6 12s.4 3.3 1.1 4.7l3.5-3.1Z" /><path fill="#EA4335" d="M12 5.9c1.5 0 2.9.5 4 1.6l3-3C17.2 2.9 14.8 2 12 2 8 2 4.4 4.2 2.7 7.3l3.5 2.7C7 7.7 9.3 5.9 12 5.9Z" /></svg>
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

// The banners sit above the header (app/(app)/layout.tsx), so with one
// showing the header and page move down by its height.
type Banner = "viewOnly" | "failed"
const VIEW_ONLY = "View-only. Your information is safe — subscribe to add or change anything. Subscribe"
const FAILED = "Your payment didn't go through. Update your card by 30 November to keep adding and editing. Update card"
const bannerH = (v: V, b?: Banner) => (b ? tl(b === "viewOnly" ? VIEW_ONLY : FAILED, (v.phone ? 390 : 1200 - SB) - 32) + 17 : 0)
function BannerBar({ v, b }: { v: V; b: Banner }) {
  const x = v.phone ? 0 : SB, y = v.phone ? 44 : 0, w = v.phone ? 390 : 1200 - SB
  return b === "viewOnly" ? (
    <Box x={x} y={y} w={w} h={bannerH(v, b)} className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm leading-5 text-amber-900">
      <strong>View-only.</strong> Your information is safe — subscribe to add or change anything. <span className="font-medium underline">Subscribe</span>
    </Box>
  ) : (
    <Box x={x} y={y} w={w} h={bannerH(v, b)} className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm leading-5 text-red-900">
      <strong>Your payment didn&rsquo;t go through.</strong> Update your card by 30 November to keep adding and editing. <span className="font-medium underline">Update card</span>
    </Box>
  )
}
const bannerRect = (v: V, b: Banner): Rect => ({ x: v.phone ? 0 : SB, y: v.phone ? 44 : 0, w: v.phone ? 390 : 1200 - SB, h: bannerH(v, b) })

function DShell({ children, h, bo, banner }: { children: ReactNode; h: number; bo: number; banner?: Banner }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      <Box x={0} y={0} w={SB} h={h} className="bg-black text-white" />
      <Img src="/icons-pwa/icon-192.png" x={76} y={20} w={88} />
      <Box x={0} y={114} w={SB} h={48} className="text-center text-[11px] leading-snug text-white/60">Your life. Organised.<br />Your future. Secured.<div className="mt-1 text-[10px] text-white/45">TAL = The Adulting Life</div></Box>
      {NAV.map((n, k) => (
        <Box key={n.t} x={12} y={navY(k)} w={216} h={37}
          className={`flex items-center gap-3 rounded-xl px-3 text-[13px] ${k === NAV_SUB ? "bg-tal-cream-soft font-medium text-tal-plum" : "text-white/85"}`}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center">{ICONS[n.i]}</span>
          <span className="flex-1 truncate">{n.t}</span>
          {n.badge && <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${k === NAV_SUB ? "bg-black text-white" : "bg-white text-black"}`}>{n.badge}</span>}
        </Box>
      ))}
      {banner && <BannerBar v={DV} b={banner} />}
      <div className="absolute left-0 w-full" style={{ top: bo, height: 64 }}>
        <Box x={SB} y={0} w={1200 - SB} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
        <Box {...SEARCH} className="flex items-center gap-2 rounded-full border border-tal-line bg-white pl-3 text-sm">
          <span className="text-tal-plum-soft"><SearchIcon /></span><span className="text-tal-plum-soft">Search your organiser…</span>
        </Box>
        <Box {...ADD} className="flex items-center justify-center gap-1.5 rounded-full border border-tal-line bg-white text-sm font-medium"><PlusIcon />Add</Box>
        <Box {...ASK} className="flex items-center justify-center gap-2 rounded-full bg-black text-sm font-medium text-white"><TalAiIcon />Ask TAL AI</Box>
        <Box {...BELL} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
        <Box {...USER} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm"><Avatar />Hi Sarah<span className="text-xs text-tal-plum-soft">▾</span></Box>
      </div>
      {children}
    </div>
  )
}
function PShell({ children, h, bo, banner }: { children: ReactNode; h: number; bo: number; banner?: Banner }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      <Box x={0} y={0} w={390} h={44} className="flex items-center justify-between px-7 text-sm font-semibold text-tal-plum-dark"><span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span></Box>
      {banner && <BannerBar v={PV} b={banner} />}
      <div className="absolute left-0 w-full" style={{ top: bo, height: 108 }}>
        <Box x={0} y={44} w={390} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
        <Img src="/icons-pwa/icon-192.png" x={16} y={58} w={36} />
        <Box {...P_ASK} className="flex items-center justify-center gap-1.5 rounded-full bg-black text-xs font-medium text-white"><TalAiIcon />TAL AI</Box>
        <Box {...P_BELL} className="flex items-center justify-center rounded-full">{ICONS.bell}</Box>
        <Box {...P_USER} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2"><Avatar /><span className="text-xs text-tal-plum-soft">▾</span></Box>
        <Box {...P_MENU} className="flex items-center justify-center rounded-full">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </Box>
      </div>
      {children}
    </div>
  )
}
const Shell = ({ v, h, banner, children }: { v: V; h: number; banner?: Banner; children: ReactNode }) => {
  const bo = bannerH(v, banner)
  return v.phone ? <PShell h={h} bo={bo} banner={banner}>{children}</PShell> : <DShell h={h} bo={bo} banner={banner}>{children}</DShell>
}

/** A dialog's dimmed backdrop over the whole (scrolled) screen. */
const Dim = ({ h, k = "bg-black/50" }: { h: number; k?: string }) => <Box x={0} y={0} w={1200} h={h} className={k} />
/** A fixed, centred dialog of width `w`, `h` tall, at scroll `at`. */
const centred = (v: V, at: number, w: number, h: number): Rect => {
  const ww = Math.min(w, v.W - 32)
  return { x: Math.round((v.W - ww) / 2), y: Math.round(at + Math.max(16, (v.H - h) / 2)), w: ww, h }
}

/** The page column: max-w-2xl on a computer, full width on a phone. */
const col = (v: V) => {
  const cw = v.phone ? v.w : 672
  return { cx: v.x, cw, ix: v.x + 24, iw: cw - 48 }
}
const PageHead = ({ v, top }: { v: V; top: number }) => {
  const { cx, cw } = col(v)
  return (
    <>
      <Box x={cx} y={top} w={cw} h={36} className="font-display text-3xl leading-9 text-tal-plum">Subscription</Box>
      <Box x={cx} y={top + 44} w={cw} h={20} className="text-sm leading-5 text-tal-plum-soft">Manage your TAL Premium membership.</Box>
    </>
  )
}

// ── Wording (from the components) ────────────────────────────────────────────

const T = {
  intro: "The full Adulting Life experience: records, Peace of Mind Planner, sharing, AI features and unlimited storage.",
  ended: "Your subscription has ended. Choose a plan below to restart.",
  enter: "Enter your card in the next step. Payments are processed securely by Stripe.",
  terms: "By clicking Subscribe you agree to our Terms & Conditions and Privacy Policy. Nothing here limits your rights under the Australian Consumer Law.",
  cancelNote: (plan: Plan) => `If you cancel: you keep access until the end of the ${plan === "monthly" ? "month" : "year"} you've already paid for, then the subscription simply stops. No further charges. Your account and data are not deleted. Deleting your account is a separate action in Settings.`,
  stripeNote: "Your card is processed securely by Stripe. The Adulting Life never sees or stores your card number.",
  fail: "Your last payment didn't go through. Change your card below and we'll try again straight away.",
  noInv: "No invoices yet — your first will appear here after your first billing cycle.",
  danger: (trial: boolean) => `Cancel any time. You'll keep access until the end of your current ${trial ? "free trial" : "billing period"}.`,
  confirm: "Cancel your TAL Premium subscription? You'll keep access until the end of your current billing period, then it won't renew.",
  resume: "Your subscription is cancelled but you still have access until 14 Dec 2026. Resume now and it will keep renewing, no new card needed.",
}

// SubscribeConsentPanel PLANS, with "today" 23 Nov 2026.
type Plan = "monthly" | "annual"
const PLANS: Record<Plan, { label: string; price: string; per: string; gst: string; billing: string; then: string }> = {
  monthly: { label: "Monthly", price: "$12.99", per: "month", gst: "$1.18", billing: "Monthly", then: "monthly on the same date" },
  annual: { label: "Annual", price: "$129.99", per: "year", gst: "$11.82", billing: "Yearly", then: "yearly on the same date" },
}
// $12.99 x 12 - $129.99
const SAVE = "Save $25.89"
const nextCharge = (plan: Plan, promo: boolean) =>
  promo ? (plan === "monthly" ? "23 Jan 2027" : "23 Dec 2027") : plan === "monthly" ? "23 Dec 2026" : "23 Nov 2027"

// ── Not subscribed: Start TAL Premium ────────────────────────────────────────

interface PS { plan: Plan; promo?: "typing" | "applied"; ended?: boolean; banner?: Banner }

function panelLayout(v: V, s: PS) {
  const { cx, cw, ix, iw } = col(v)
  const bo = bannerH(v, s.banner)
  const top = v.top + bo
  let y = top + 88
  let endedBox: Rect | undefined
  if (s.ended) {
    endedBox = { x: cx, y: top + 80, w: cw, h: tl(T.ended, cw - 32) + 26 }
    y = endedBox.y + endedBox.h + 24
  }
  const card0 = y
  const h2 = { x: ix, y: y + 24, w: iw, h: 28 }
  const intro = { x: ix, y: h2.y + 32, w: iw, h: tl(T.intro, iw) }
  // Plan toggle: p-1, two buttons (the Annual one carries the savings badge).
  const toggle = { x: ix, y: intro.y + intro.h + 20, w: iw, h: 92 }
  const bw = (iw - 8 - 8) / 2
  const monthly = { x: ix + 4, y: toggle.y + 4, w: bw, h: 84 }
  const annual = { x: ix + 4 + bw + 8, y: toggle.y + 4, w: bw, h: 84 }
  // Summary rows (flex, label left, value right)
  const promo = s.promo === "applied"
  const cfg = PLANS[s.plan]
  const ddW = (dt: string) => iw - dt.length * CW - 12
  const rows: { k: string; h: number }[] = [
    { k: "Price", h: tl(`${cfg.price} AUD / ${cfg.per}`, ddW("Price")) + tlx(`Includes GST (approx. ${cfg.gst})`, ddW("Price")) },
    { k: "Billing", h: tl(`${cfg.billing}, automatic renewal`, ddW("Billing")) },
    { k: "First charge", h: promo ? tl("Free for your first month", ddW("First charge")) + 2 + tlx("Card charged on 23 Dec 2026 unless you cancel", ddW("First charge")) : tl("Today, when you click Subscribe", ddW("First charge")) },
    { k: "Next charge after that", h: tl(`${nextCharge(s.plan, promo)}, then ${cfg.then}`, ddW("Next charge after that")) },
    { k: "Cancel", h: tl("Anytime on this page, one click", ddW("Cancel")) },
  ]
  let ry = toggle.y + toggle.h + 20 + 1 + 20
  const sumTop = ry - 21
  const rowR: Record<string, Rect> = {}
  rows.forEach((r) => { rowR[r.k] = { x: ix, y: ry, w: iw, h: r.h }; ry += r.h + 12 })
  ry -= 12
  // Discount code
  const codeTop = ry + 20
  const codeLabel = { x: ix, y: codeTop + 21, w: iw, h: 16 }
  const input = { x: ix, y: codeLabel.y + 20, w: iw, h: 40 }
  let cy = input.y + input.h
  const msg = { x: ix, y: cy + 8, w: iw, h: 16 }
  if (promo) cy = msg.y + msg.h
  // If you cancel
  const note = { x: ix, y: cy + 16, w: iw, h: tlx(T.cancelNote(s.plan), iw - 24) + 26 }
  // Subscribe
  const btnTop = note.y + note.h + 24
  const btn = { x: ix, y: btnTop + 21, w: iw, h: 48 }
  const enter = { x: ix, y: btn.y + 56, w: iw, h: tlx(T.enter, iw) }
  const terms = { x: ix, y: enter.y + enter.h + 16, w: iw, h: wrapLines(T.terms, iw, 5.6) * 15 }
  const card = { x: cx, y: card0, w: cw, h: terms.y + terms.h + 24 - card0 }
  const h = Math.max(v.H, card.y + card.h + 32)
  return { top, bo, h, endedBox, card, h2, intro, toggle, monthly, annual, sumTop, rowR, summary: { x: ix, y: sumTop, w: iw, h: ry - sumTop }, codeTop, codeLabel, input, msg, note, btnTop, btn, enter, terms }
}

/** One summary row: label left, value right. */
const Row = ({ r, k, children }: { r: Rect; k: string; children: ReactNode }) => (
  <Box {...r} className="flex justify-between gap-3 text-sm leading-5">
    <span className="shrink-0 text-tal-plum-soft">{k}</span>
    <div className="text-right text-tal-plum">{children}</div>
  </Box>
)

function Panel({ v, s, children, fabs }: { v: V; s: PS; children?: ReactNode; fabs?: boolean }) {
  const L = panelLayout(v, s)
  const { ix, iw } = col(v)
  const promo = s.promo === "applied"
  const cfg = PLANS[s.plan]
  return (
    <Shell v={v} h={L.h} banner={s.banner}>
      <PageHead v={v} top={L.top} />
      {L.endedBox && <Box {...L.endedBox} className="rounded-xl border border-tal-line bg-tal-cream-soft px-4 py-3 text-sm leading-5 text-tal-plum">{T.ended}</Box>}
      <Box {...L.card} className="rounded-2xl bg-white shadow-sm" />
      <Box {...L.h2} className="text-xl font-semibold leading-7 text-tal-plum">Start TAL Premium</Box>
      <Box {...L.intro} className="text-sm leading-5 text-gray-600">{T.intro}</Box>

      {/* Plan toggle */}
      <Box {...L.toggle} className="rounded-xl bg-tal-cream-soft" />
      {(["monthly", "annual"] as const).map((k) => {
        const p = PLANS[k]
        const on = s.plan === k
        return (
          <Box key={k} {...(k === "monthly" ? L.monthly : L.annual)} className={`flex flex-col items-center px-3 pt-3 text-center text-sm font-medium ${on ? "rounded-lg bg-white text-tal-plum shadow-sm" : "text-tal-plum-soft"}`}>
            <div className="font-semibold leading-5">{p.label}</div>
            <div className="mt-0.5 text-xs leading-4">{p.price} / {p.per}</div>
            {k === "annual" && <div className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">{SAVE}</div>}
          </Box>
        )
      })}

      {/* Summary */}
      <Box x={ix} y={L.sumTop} w={iw} h={1} className="bg-tal-line" />
      <Row r={L.rowR["Price"]} k="Price">
        <div className="font-semibold">{cfg.price} AUD / {cfg.per}</div>
        <div className="text-xs leading-4 text-tal-plum-soft">Includes GST (approx. {cfg.gst})</div>
      </Row>
      <Row r={L.rowR["Billing"]} k="Billing">{cfg.billing}, automatic renewal</Row>
      <Row r={L.rowR["First charge"]} k="First charge">
        {promo ? (
          <>
            <div className="font-medium text-emerald-700">Free for your first month</div>
            <div className="mt-0.5 text-xs leading-4 text-tal-plum-soft">Card charged on 23 Dec 2026 unless you cancel</div>
          </>
        ) : "Today, when you click Subscribe"}
      </Row>
      <Row r={L.rowR["Next charge after that"]} k="Next charge after that">{nextCharge(s.plan, promo)}, then {cfg.then}</Row>
      <Row r={L.rowR["Cancel"]} k="Cancel">Anytime on this page, one click</Row>

      {/* Discount code */}
      <Box x={ix} y={L.codeTop} w={iw} h={1} className="bg-tal-line" />
      <Box {...L.codeLabel} className="text-xs uppercase leading-4 tracking-widest text-tal-plum-soft">Have a discount code?</Box>
      <Box {...L.input} className={`flex items-center rounded-lg border bg-white px-3 text-sm ${s.promo === "typing" ? "border-tal-plum/40 ring-2 ring-tal-plum/40" : "border-tal-line"}`}>
        {s.promo === "typing" ? <Typed text="adulting101" delay={600} speed={90} /> : promo ? "adulting101" : <span className="text-gray-400">e.g. Life103</span>}
      </Box>
      {promo && <Box {...L.msg} className="text-xs leading-4 text-emerald-700">✓ Code applied. Your first month is free.</Box>}

      {/* If you cancel */}
      <Box {...L.note} className="rounded-xl border border-tal-line bg-tal-cream-soft p-3 text-xs leading-4 text-tal-plum-soft">
        <strong className="text-tal-plum">If you cancel:</strong> you keep access until the end of the {s.plan === "monthly" ? "month" : "year"} you&apos;ve already paid for, then the subscription simply stops. No further charges. Your account and data are not deleted. Deleting your account is a separate action in <em>Settings</em>.
      </Box>

      {/* Subscribe */}
      <Box x={ix} y={L.btnTop} w={iw} h={1} className="bg-tal-line" />
      <Box {...L.btn} className="flex items-center justify-center rounded-xl bg-black text-sm font-semibold text-white">
        {promo ? "Start my free month" : `Subscribe — ${cfg.price} / ${cfg.per}`}
      </Box>
      <Box {...L.enter} className="text-center text-xs leading-4 text-tal-plum-soft">{T.enter}</Box>
      <Box {...L.terms} className="text-[11px] leading-[15px] text-tal-plum-soft">
        By clicking Subscribe you agree to our <span className="underline">Terms &amp; Conditions</span> and <span className="underline">Privacy Policy</span>. Nothing here limits your rights under the Australian Consumer Law.
      </Box>
      {fabs && <Fabs {...FAB(v)} />}
      {children}
    </Shell>
  )
}

// ── The Stripe card popup (StripeCardDialog) ─────────────────────────────────

type Kind = "subscribe" | "update"
type CardState = "empty" | "typing" | "busy" | "done"
const SUMMARY = "First month free, then $12.99 monthly"
const DONE_MSG: Record<Kind, string> = { subscribe: "You're subscribed — enjoy your free month!", update: "Your card has been updated." }
const NEW_CARD: Record<Kind, { num: string; exp: string; cvc: string }> = {
  subscribe: { num: "4564 8120 3317 4242", exp: "08 / 28", cvc: "381" },
  update: { num: "5163 2045 8810 3376", exp: "03 / 30", cvc: "527" },
}

function cardDlg(v: V, at: number, kind: Kind, state: CardState) {
  const w = Math.min(448, v.W - 32)
  const headH = kind === "subscribe" ? 16 + 28 + 22 + 16 : 16 + 28 + 16
  const noteH = tlx(T.stripeNote, w - 40)
  const bodyH = state === "done" ? 20 + 16 + 56 + 12 + 24 + 20 + 40 + 16 + 20 : 20 + 64 + 12 + 62 + 12 + 62 + 12 + 62 + 16 + noteH + 16 + 40 + 20
  const r = centred(v, at, 448, headH + bodyH)
  const bx = r.x + 20, bw = r.w - 40, by = r.y + headH + 20
  const tabs = { x: bx, y: by, w: bw, h: 64 }
  const num = { x: bx, y: by + 76, w: bw, h: 62 }
  const half = (bw - 12) / 2
  const exp = { x: bx, y: by + 150, w: half, h: 62 }
  const cvc = { x: bx + half + 12, y: by + 150, w: half, h: 62 }
  const country = { x: bx, y: by + 224, w: bw, h: 62 }
  const note = { x: bx, y: by + 302, w: bw, h: noteH }
  const btnY = note.y + noteH + 16
  const sw = state === "busy" ? 124 : 104
  const submit = { x: bx + bw - sw, y: btnY, w: sw, h: 40 }
  const cancel = { x: submit.x - 8 - 82, y: btnY, w: 82, h: 40 }
  const tick = { x: r.x + r.w / 2 - 28, y: by + 16, w: 56, h: 56 }
  const msg = { x: bx, y: by + 84, w: bw, h: 24 }
  const done = { x: r.x + r.w / 2 - 40, y: msg.y + 44, w: 80, h: 40 }
  const head = { x: r.x, y: r.y, w: r.w, h: headH }
  return { r, head, tabs, num, exp, cvc, country, note, submit, cancel, tick, msg, done, fields: span(num, country) }
}
const Field = ({ r, label, children, focus }: { r: Rect; label: string; children: ReactNode; focus?: boolean }) => (
  <Box {...r}>
    <div className="mb-1 text-[13px] leading-[18px] text-gray-700">{label}</div>
    <div className={`flex h-11 items-center gap-2 rounded-xl border bg-white px-3 text-[15px] text-[#3a2a2e] shadow-sm ${focus ? "border-black ring-2 ring-black/15" : "border-gray-300"}`}>{children}</div>
  </Box>
)
function CardDialog({ v, at, h, kind, state }: { v: V; at: number; h: number; kind: Kind; state: CardState }) {
  const d = cardDlg(v, at, kind, state)
  const c = NEW_CARD[kind]
  const filled = state === "busy"
  const tw = (d.tabs.w - 16) / 3
  const tab = (k: number, icon: ReactNode, label: string) => (
    <div key={label} className={`absolute flex flex-col justify-center gap-1 rounded-xl border bg-white px-3 text-sm shadow-sm ${k === 0 ? "border-black text-black ring-1 ring-black" : "border-gray-300 text-gray-600"}`} style={{ left: k * (tw + 8), top: 0, width: tw, height: 64 }}>
      <span className="flex h-5 items-center">{icon}</span><span className="font-medium leading-5">{label}</span>
    </div>
  )
  return (
    <>
      <Dim h={h} />
      <Box {...d.r} className="overflow-hidden rounded-2xl bg-white shadow-xl" />
      <Box {...d.head} className="rounded-t-2xl bg-black px-5 py-4 text-white">
        <div className="font-display text-lg leading-7">{kind === "subscribe" ? "Subscribe to TAL Premium" : "Change your card"}</div>
        {kind === "subscribe" && <div className="mt-0.5 text-sm leading-5 text-white/80">{SUMMARY}</div>}
      </Box>
      {state === "done" ? (
        <>
          <Box {...d.tick} className="flex items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</Box>
          <Box {...d.msg} className="text-center font-medium leading-6 text-tal-plum">{DONE_MSG[kind]}</Box>
          <Box {...d.done} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Done</Box>
        </>
      ) : (
        <>
          <Box {...d.tabs}>
            {tab(0, <CardIcon />, "Card")}
            {tab(1, <AppleIcon />, "Apple Pay")}
            {tab(2, <GoogleIcon />, "Google Pay")}
          </Box>
          <Field r={d.num} label="Card number" focus={state === "typing"}>
            <span className="flex-1 tabular-nums">{state === "typing" ? <Typed text={c.num} delay={500} speed={55} /> : filled ? c.num : <span className="text-gray-400">1234 1234 1234 1234</span>}</span>
            <span className="rounded border border-gray-200 px-1 text-[9px] font-bold italic text-blue-800">VISA</span>
            <span className="rounded border border-gray-200 px-1 text-[9px] font-bold text-orange-600">MC</span>
            <span className="rounded border border-gray-200 px-1 text-[9px] font-bold text-sky-600">AMEX</span>
          </Field>
          <Field r={d.exp} label="Expiration date">{state === "typing" ? <Typed text={c.exp} delay={1700} speed={80} /> : filled ? c.exp : <span className="text-gray-400">MM / YY</span>}</Field>
          <Field r={d.cvc} label="Security code">{state === "typing" ? <Typed text={c.cvc} delay={2400} speed={90} /> : filled ? c.cvc : <span className="text-gray-400">CVC</span>}</Field>
          <Field r={d.country} label="Country"><span className="flex-1">Australia</span><span className="text-xs text-gray-500">▾</span></Field>
          <Box {...d.note} className="text-xs leading-4 text-tal-plum-soft">{T.stripeNote}</Box>
          <Box {...d.cancel} className={`flex items-center justify-center rounded-xl border border-tal-line text-sm text-tal-plum ${state === "busy" ? "opacity-60" : ""}`}>Cancel</Box>
          <Box {...d.submit} className={`flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white ${state === "busy" ? "opacity-60" : ""}`}>
            {state === "busy" ? "Processing…" : kind === "subscribe" ? "Subscribe" : "Save card"}
          </Box>
        </>
      )}
    </>
  )
}

// ── Subscribed: the plan card, Billing history, Danger zone ──────────────────

type Status = "trial" | "active" | "cancelled" | "failed"
interface SS { st: Status; card: "visa" | "mc"; confirm?: boolean; banner?: Banner }

// page.tsx STATUS_LABEL / STATUS_TONE
const BADGE: Record<Status, { label: string; tone: string; w: number }> = {
  trial: { label: "Free trial", tone: "bg-emerald-100 text-emerald-800", w: 96 },
  active: { label: "Active", tone: "bg-green-100 text-green-800", w: 72 },
  cancelled: { label: "Cancelled", tone: "bg-gray-100 text-gray-800", w: 98 },
  failed: { label: "Payment failed", tone: "bg-red-100 text-red-800", w: 134 },
}
const CARD_TEXT = { visa: "Visa ending 4242 · exp 08/28", mc: "Mastercard ending 3376 · exp 03/30" }
// Sarah's invoices since she subscribed on 14 Jun 2026 (newest first).
const INVOICES = ["14 Nov 2026", "14 Oct 2026", "14 Sep 2026", "14 Aug 2026", "14 Jul 2026", "14 Jun 2026"].map((d, k) => ({ d, n: `#8F3A21C7-${String(6 - k).padStart(4, "0")}`, amt: "$12.99" }))
// The free month starts with a $0.00 invoice from Stripe.
const TRIAL_INVOICES = [{ d: "23 Nov 2026", n: "#5C71E0B2-0001", amt: "$0.00" }]

function subLayout(v: V, s: SS) {
  const P = v.phone
  const { cx, cw, ix, iw } = col(v)
  const bo = bannerH(v, s.banner)
  const top = v.top + bo
  // Plan card
  const y0 = top + 88
  const label = { x: ix, y: y0 + 24, w: 200, h: 16 }
  const name = { x: ix, y: y0 + 44, w: iw - 150, h: 28 }
  const price = { x: ix, y: y0 + 76, w: 300, h: 20 }
  const bw = BADGE[s.st].w
  const badge = { x: ix + iw - bw, y: y0 + 24, w: bw, h: 24 }
  let y = y0 + 24 + 72
  let failNote: Rect | undefined
  if (s.st === "failed") {
    failNote = { x: ix, y: y + 16, w: iw, h: tl(T.fail, iw - 24) + 16 }
    y = failNote.y + failNote.h
  }
  y += 24
  const half = (iw - 16) / 2
  const started = { x: ix, y, w: P ? iw : half, h: 40 }
  const next = P ? { x: ix, y: y + 56, w: iw, h: 40 } : { x: ix + half + 16, y, w: half, h: 40 }
  y = next.y + 56
  const pm = { x: ix, y, w: iw, h: 16 }
  const text = CARD_TEXT[s.card]
  const textW = text.length * CW
  const wraps = textW + 12 + 92 > iw
  const cardText = { x: ix, y: y + 20 + (wraps ? 0 : 6), w: Math.ceil(textW) + 4, h: 20 }
  const change = wraps ? { x: ix, y: y + 20 + 20 + 12, w: 92, h: 32 } : { x: ix + Math.ceil(textW) + 16, y: y + 20, w: 92, h: 32 }
  const planCard = { x: cx, y: y0, w: cw, h: change.y + 32 + 24 - y0 }
  // Billing history
  const b0 = planCard.y + planCard.h + 24
  const billH2 = { x: ix, y: b0 + 24, w: iw, h: 28 }
  const inv = s.st === "trial" ? TRIAL_INVOICES : INVOICES
  const rows = inv.map((_, k) => ({ x: ix, y: billH2.y + 28 + 16 + k * 61, w: iw, h: 60 }))
  // Right side of each row: amount, status, View, PDF
  const rowParts = (r: Rect) => {
    const pdf = { x: r.x + r.w - 22, y: r.y + 22, w: 22, h: 16 }
    const view = { x: pdf.x - 12 - 28, y: r.y + 22, w: 28, h: 16 }
    const badge = { x: view.x - 12 - 40, y: r.y + 20, w: 40, h: 20 }
    const amt = { x: badge.x - 12 - 48, y: r.y + 20, w: 48, h: 20 }
    return { pdf, view, badge, amt }
  }
  const billCard = { x: cx, y: b0, w: cw, h: rows[rows.length - 1].y + 60 + 24 - b0 }
  y = billCard.y + billCard.h + 24
  // Changed your mind? (cancelled) or Danger zone
  let resume: { box: Rect; btn: Rect } | undefined
  let danger: { box: Rect; text: Rect; link: Rect; confirm?: Rect; yes?: Rect; keep?: Rect } | undefined
  if (s.st === "cancelled") {
    const th = tl(T.resume, iw)
    const btn = { x: ix, y: y + 24 + 28 + 4 + th + 16, w: 178, h: 36 }
    resume = { box: { x: cx, y, w: cw, h: btn.y + 36 + 24 - y }, btn }
  } else {
    const dt = T.danger(s.st === "trial")
    const text = { x: ix, y: y + 24 + 28 + 4, w: iw, h: tl(dt, iw) }
    const ly = text.y + text.h + 16
    const link = { x: ix, y: ly, w: 150, h: 20 }
    if (s.confirm) {
      const ch = 16 + tl(T.confirm, iw - 32) + 12 + 36 + 16
      const confirm = { x: ix, y: ly, w: iw, h: ch }
      const yes = { x: ix + 16, y: ly + ch - 16 - 36, w: 106, h: 36 }
      const keep = { x: yes.x + yes.w + 8, y: yes.y, w: 152, h: 36 }
      danger = { box: { x: cx, y, w: cw, h: ly + ch + 24 - y }, text, link, confirm, yes, keep }
    } else danger = { box: { x: cx, y, w: cw, h: ly + 20 + 24 - y }, text, link }
  }
  const last = resume ? resume.box : danger!.box
  const h = Math.max(v.H, last.y + last.h + 32)
  return { top, bo, h, label, name, price, badge, failNote, started, next, pm, cardText, change, planCard, billH2, inv, rows, rowParts, billCard, resume, danger }
}
type SL = ReturnType<typeof subLayout>

function Subscribed({ v, s, children, fabs }: { v: V; s: SS; children?: ReactNode; fabs?: boolean }) {
  const L = subLayout(v, s)
  const b = BADGE[s.st]
  const dtCls = "text-xs uppercase leading-4 tracking-widest text-tal-plum-soft"
  const nextLabel = s.st === "trial" ? "Free trial ends" : s.st === "cancelled" ? "Access ends" : "Next billing date"
  const nextDate = s.st === "trial" ? "23 Dec 2026" : "14 Dec 2026"
  const startedOn = s.st === "trial" ? "23 Nov 2026" : "14 Jun 2026"
  return (
    <Shell v={v} h={L.h} banner={s.banner}>
      <PageHead v={v} top={L.top} />
      {/* Plan */}
      <Box {...L.planCard} className="rounded-2xl bg-white shadow-sm" />
      <Box {...L.label} className={dtCls}>Plan</Box>
      <Box {...L.name} className="text-xl font-semibold leading-7 text-tal-plum">TAL Premium — Monthly</Box>
      <Box {...L.price} className="text-sm leading-5 text-gray-700">$12.99 AUD / month</Box>
      <Box {...L.badge} className={`flex items-center justify-center rounded-full text-xs font-semibold uppercase tracking-wider ${b.tone}`}>{b.label}</Box>
      {L.failNote && <Box {...L.failNote} className="rounded bg-red-50 px-3 py-2 text-sm leading-5 text-red-800">{T.fail}</Box>}
      <Box {...L.started}><div className={dtCls}>Started</div><div className="mt-1 text-sm leading-5 text-gray-800">{startedOn}</div></Box>
      <Box {...L.next}><div className={dtCls}>{nextLabel}</div><div className="mt-1 text-sm leading-5 text-gray-800">{nextDate}</div></Box>
      <Box {...L.pm} className={dtCls}>Payment method</Box>
      <Box {...L.cardText} className="whitespace-nowrap text-sm leading-5 text-gray-800">{CARD_TEXT[s.card]}</Box>
      <Box {...L.change} className="flex items-center justify-center rounded-lg border border-tal-line bg-white text-xs font-medium text-tal-plum">Change card</Box>

      {/* Billing history */}
      <Box {...L.billCard} className="rounded-2xl bg-white shadow-sm" />
      <Box {...L.billH2} className="text-lg font-semibold leading-7 text-tal-plum">Billing history</Box>
      {L.rows.map((r, k) => {
        const inv = L.inv[k]
        const p = L.rowParts(r)
        return (
          <Box key={inv.n} x={0} y={0} w={0} h={0}>
            {k > 0 && <Box x={r.x} y={r.y - 1} w={r.w} h={1} className="bg-gray-100" />}
            <Box x={r.x} y={r.y + 12} w={140} h={36}>
              <div className="text-sm font-medium leading-5 text-gray-900">{inv.d}</div>
              <div className="text-xs leading-4 text-gray-500">{inv.n}</div>
            </Box>
            <Box {...p.amt} className="text-right text-sm tabular-nums leading-5 text-gray-800">{inv.amt}</Box>
            <Box {...p.badge} className="flex items-center justify-center rounded-full bg-green-100 text-[10px] font-semibold uppercase tracking-wider text-green-800">Paid</Box>
            <Box {...p.view} className="text-xs leading-4 text-tal-plum underline underline-offset-2">View</Box>
            <Box {...p.pdf} className="text-xs leading-4 text-tal-plum underline underline-offset-2">PDF</Box>
          </Box>
        )
      })}

      {/* Changed your mind? */}
      {L.resume && (
        <>
          <Box {...L.resume.box} className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold leading-7 text-tal-plum">Changed your mind?</div>
            <p className="mt-1 text-sm leading-5 text-gray-600">Your subscription is cancelled but you still have access until <strong>14 Dec 2026</strong>. Resume now and it will keep renewing, no new card needed.</p>
          </Box>
          <Box {...L.resume.btn} className="flex items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">Resume subscription</Box>
        </>
      )}

      {/* Danger zone */}
      {L.danger && (
        <>
          <Box {...L.danger.box} className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="text-lg font-semibold leading-7 text-tal-plum">Danger zone</div>
          </Box>
          <Box {...L.danger.text} className="text-sm leading-5 text-gray-600">{T.danger(s.st === "trial")}</Box>
          {L.danger.confirm ? (
            <>
              <Box {...L.danger.confirm} className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-5 text-red-900">{T.confirm}</Box>
              <Box {...L.danger.yes!} className="flex items-center justify-center rounded-full bg-red-600 text-sm font-semibold text-white">Yes, cancel</Box>
              <Box {...L.danger.keep!} className="flex items-center justify-center rounded-full text-sm text-gray-700">Keep subscription</Box>
            </>
          ) : (
            <Box {...L.danger.link} className="text-sm leading-5 text-red-700 underline underline-offset-2">Cancel subscription</Box>
          )}
        </>
      )}
      {fabs && <Fabs {...FAB(v)} />}
      {children}
    </Shell>
  )
}

// ── Stripe's own pages: the hosted invoice (View) and the invoice PDF ───────

function hostedLayout(v: V) {
  const w = v.phone ? 358 : 440
  const x = (v.W - w) / 2
  const y0 = v.phone ? 64 : 40
  const card = { x, y: y0 + 56, w, h: 452 }
  const amount = { x: x + 24, y: card.y + 72, w: w - 48, h: 76 }
  const details = { x: x + 24, y: card.y + 172, w: w - 48, h: 132 }
  const buttons = { x: x + 24, y: card.y + 328, w: w - 48, h: 100 }
  return { y0, card, amount, details, buttons }
}
function HostedInvoice({ v }: { v: V }) {
  const L = hostedLayout(v)
  const row = (k: string, val: ReactNode) => (
    <div className="flex justify-between border-b border-gray-100 py-2.5 text-sm leading-5 last:border-0"><span className="text-gray-500">{k}</span><span className="text-gray-900">{val}</span></div>
  )
  return (
    <div className="absolute left-0 top-0 w-full bg-[#f6f8fa] font-sans" style={{ height: v.H }}>
      {v.phone && <Box x={0} y={0} w={390} h={44} className="flex items-center justify-between px-7 text-sm font-semibold text-gray-800"><span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span></Box>}
      <Img src="/icons-pwa/icon-192.png" x={L.card.x} y={L.y0} w={32} className="rounded-lg" />
      <Box x={L.card.x + 42} y={L.y0 + 6} w={300} h={20} className="text-sm font-medium leading-5 text-gray-900">The Adulting Life</Box>
      <Box {...L.card} className="rounded-xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)]" />
      <Box x={L.card.x + 24} y={L.card.y + 24} w={300} h={32} className="flex items-center gap-2 text-sm leading-5 text-gray-500">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">✓</span>Invoice paid
      </Box>
      <Box {...L.amount}>
        <div className="text-4xl font-semibold leading-[44px] text-gray-900">$12.99</div>
        <div className="mt-1 text-sm leading-5 text-gray-500">Paid 14 November 2026</div>
      </Box>
      <Box {...L.details}>
        {row("Invoice number", "8F3A21C7-0006")}
        {row("Payment date", "14 November 2026")}
        {row("Payment method", <span className="flex items-center gap-1.5"><span className="rounded border border-gray-200 px-1 text-[9px] font-bold italic text-blue-800">VISA</span>•••• 4242</span>)}
      </Box>
      <Box {...L.buttons} className="flex flex-col gap-3">
        <div className="flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-800"><DownloadIcon />Download invoice</div>
        <div className="flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-800"><DownloadIcon />Download receipt</div>
      </Box>
      <Box x={L.card.x} y={L.card.y + L.card.h + 20} w={L.card.w} h={20} className="text-center text-xs leading-5 text-gray-400">Powered by <b className="text-gray-500">stripe</b> · Terms · Privacy</Box>
    </div>
  )
}

const PDF_W = 540
function pdfLayout(v: V) {
  const k = v.phone ? 358 / PDF_W : 1
  const x = v.phone ? 16 : (1200 - PDF_W) / 2
  const y = v.phone ? 110 : 52
  return { k, page: { x, y, w: PDF_W * k, h: 700 * k } }
}
function InvoicePdf({ v }: { v: V }) {
  const L = pdfLayout(v)
  const r = (a: string, b: string) => <div className="flex justify-between py-1"><span>{a}</span><span>{b}</span></div>
  return (
    <div className="absolute left-0 top-0 w-full bg-[#525659] font-sans" style={{ height: v.H }}>
      {v.phone && <Box x={0} y={0} w={390} h={44} className="flex items-center justify-between bg-white px-7 text-sm font-semibold text-gray-800"><span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span></Box>}
      <Box x={0} y={v.phone ? 44 : 0} w={v.W} h={40} className="flex items-center justify-between bg-[#323639] px-4 text-xs text-white/85">
        <span className="truncate">Invoice-8F3A21C7-0006.pdf</span><span className="flex items-center gap-3"><span>1 / 1</span><DownloadIcon /></span>
      </Box>
      <Box {...L.page} className="overflow-hidden bg-white shadow-xl">
        <div className="absolute left-0 top-0 p-10 text-[11px] leading-4 text-gray-800" style={{ width: PDF_W, height: 700, transform: `scale(${L.k})`, transformOrigin: "top left" }}>
          <div className="flex items-start justify-between">
            <div className="text-2xl font-semibold text-gray-900">Invoice</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons-pwa/icon-192.png" alt="" className="h-10 w-10 rounded-lg" />
          </div>
          <div className="mt-4 grid w-64 grid-cols-2 gap-y-1">
            <span className="text-gray-500">Invoice number</span><span>8F3A21C7-0006</span>
            <span className="text-gray-500">Date of issue</span><span>14 November 2026</span>
            <span className="text-gray-500">Date due</span><span>14 November 2026</span>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-6">
            <div><div className="font-semibold text-gray-900">The Adulting Life</div><div>info@theadultinglife.com.au</div></div>
            <div><div className="font-semibold text-gray-900">Bill to</div><div>Sarah Taylor</div><div>sarah.taylor@example.com</div></div>
          </div>
          <div className="mt-8 text-base font-semibold text-gray-900">$12.99 AUD paid on 14 November 2026</div>
          <div className="mt-6 grid grid-cols-[1fr_40px_80px_80px] border-b border-gray-300 pb-1 text-gray-500">
            <span>Description</span><span className="text-right">Qty</span><span className="text-right">Unit price</span><span className="text-right">Amount</span>
          </div>
          <div className="grid grid-cols-[1fr_40px_80px_80px] border-b border-gray-200 py-2">
            <span><span className="block text-gray-900">TAL Premium — Monthly</span><span className="text-gray-500">14 Nov – 14 Dec 2026</span></span>
            <span className="text-right">1</span><span className="text-right">$12.99</span><span className="text-right">$12.99</span>
          </div>
          <div className="ml-auto mt-3 w-56">
            {r("Subtotal", "$12.99")}
            {r("Total", "$12.99")}
            <div className="flex justify-between border-t border-gray-300 py-1 font-semibold text-gray-900"><span>Amount paid</span><span>$12.99 AUD</span></div>
          </div>
          <div className="absolute bottom-10 left-10 right-10 border-t border-gray-200 pt-2 text-gray-500">8F3A21C7-0006 · $12.99 AUD paid on 14 November 2026 · Page 1 of 1</div>
        </div>
      </Box>
    </div>
  )
}

// ── Steps ────────────────────────────────────────────────────────────────────

const BASE = "app.theadultinglife.com.au"
const U = { sub: `${BASE}/subscription`, inv: "invoice.stripe.com/i/acct_1QtAL…", pdf: "pay.stripe.com/invoice/acct_1QtAL…/pdf" }

// Not-subscribed states, in the order they happen.
const P_M: PS = { plan: "monthly" }
const P_A: PS = { plan: "annual" }
const P_TYPE: PS = { plan: "monthly", promo: "typing" }
const P_PROMO: PS = { plan: "monthly", promo: "applied" }
const P_ENDED: PS = { plan: "monthly", ended: true, banner: "viewOnly" }
// Subscribed states.
const S_TRIAL: SS = { st: "trial", card: "visa" }
const S_ACT: SS = { st: "active", card: "visa" }
const S_ACT2: SS = { st: "active", card: "mc" }
const S_CONF: SS = { ...S_ACT2, confirm: true }
const S_CANC: SS = { st: "cancelled", card: "mc" }
const S_FAIL: SS = { st: "failed", card: "mc", banner: "failed" }

function build(v: V): { screens: Record<string, ReactNode>; steps: WalkStep[] } {
  const P = v.phone
  const sc = (h: number, y: number) => Math.max(0, Math.min(h - v.H, Math.round(y - v.H * 0.4)))
  const fz = (r: Rect, s: number) => ({ x: P ? 195 : r.x + r.w / 2, y: r.y + r.h / 2, scale: P ? Math.min(s, 1.06) : s })
  const fzs = (r: Rect, s: number) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, scale: s })
  const dlgFocus = (r: Rect, s: number) => ({ x: P ? 195 : 600, y: r.y + r.h / 2, scale: P ? 1.04 : s })
  const sF = (h: number, r: Rect) => sc(h, r.y + r.h / 2)

  const pm = panelLayout(v, P_M), pa = panelLayout(v, P_A), pt = panelLayout(v, P_TYPE), pp = panelLayout(v, P_PROMO), pe = panelLayout(v, P_ENDED)
  const lt = subLayout(v, S_TRIAL), la = subLayout(v, S_ACT), la2 = subLayout(v, S_ACT2), lc = subLayout(v, S_CONF), lx = subLayout(v, S_CANC), lf = subLayout(v, S_FAIL)
  const fab = FAB(v)

  // Scroll positions (and where the fixed pop-ups sit)
  const atSub = sc(pp.h, pp.btn.y)
  const atCard = sc(la.h, la.change.y)
  const ds = cardDlg(v, atSub, "subscribe", "empty"), dsb = cardDlg(v, atSub, "subscribe", "busy"), dsd = cardDlg(v, atSub, "subscribe", "done")
  const du = cardDlg(v, atCard, "update", "empty"), dud = cardDlg(v, atCard, "update", "done")
  const hl = hostedLayout(v), pl = pdfLayout(v)
  const r0 = (L: SL) => L.rowParts(L.rows[0])

  const screens: Record<string, ReactNode> = {
    m: <Panel v={v} s={P_M} />,
    a: <Panel v={v} s={P_A} />,
    type: <Panel v={v} s={P_TYPE} />,
    promo: <Panel v={v} s={P_PROMO} />,
    dlg: <Panel v={v} s={P_PROMO}><CardDialog v={v} at={atSub} h={pp.h} kind="subscribe" state="empty" /></Panel>,
    dlgType: <Panel v={v} s={P_PROMO}><CardDialog v={v} at={atSub} h={pp.h} kind="subscribe" state="typing" /></Panel>,
    dlgBusy: <Panel v={v} s={P_PROMO}><CardDialog v={v} at={atSub} h={pp.h} kind="subscribe" state="busy" /></Panel>,
    dlgDone: <Panel v={v} s={P_PROMO}><CardDialog v={v} at={atSub} h={pp.h} kind="subscribe" state="done" /></Panel>,
    trial: <Subscribed v={v} s={S_TRIAL} />,
    act: <Subscribed v={v} s={S_ACT} />,
    upd: <Subscribed v={v} s={S_ACT}><CardDialog v={v} at={atCard} h={la.h} kind="update" state="empty" /></Subscribed>,
    updType: <Subscribed v={v} s={S_ACT}><CardDialog v={v} at={atCard} h={la.h} kind="update" state="typing" /></Subscribed>,
    updDone: <Subscribed v={v} s={S_ACT}><CardDialog v={v} at={atCard} h={la.h} kind="update" state="done" /></Subscribed>,
    act2: <Subscribed v={v} s={S_ACT2} />,
    hosted: <HostedInvoice v={v} />,
    pdf: <InvoicePdf v={v} />,
    conf: <Subscribed v={v} s={S_CONF} />,
    canc: <Subscribed v={v} s={S_CANC} />,
    fail: <Subscribed v={v} s={S_FAIL} />,
    ended: <Panel v={v} s={P_ENDED} />,
    fabs: <Subscribed v={v} s={S_ACT2} fabs />,
  }

  const navRect = { x: 12, y: navY(NAV_SUB), w: 216, h: 37 }
  const head = (L: { top: number }) => ({ x: v.x, y: L.top, w: col(v).cw, h: 64 })
  const steps: WalkStep[] = [
    // Not subscribed yet
    { screen: "m", url: U.sub, caption: "Subscription", detail: P ? "Open it from the ☰ menu or your avatar. Not subscribed yet? This is where you start TAL Premium." : "Open it from Subscription in the sidebar or your avatar. Not subscribed yet? This is where you start TAL Premium.", focus: P ? fz(head(pm), 1.3) : { x: 500, y: 300, scale: 1.1 }, ring: P ? pad(head(pm), 4) : navRect, duration: 6500 },
    { screen: "m", url: U.sub, caption: "Start TAL Premium", detail: "Everything in one plan: your records, the Peace of Mind Planner, sharing, the AI features and unlimited storage.", focus: fz(span(pm.h2, pm.intro), 1.4), ring: pad(span(pm.h2, pm.intro), 4), duration: 6500 },
    { screen: "m", url: U.sub, caption: "Monthly or Annual", detail: "Monthly is $12.99 a month. Annual is $129.99 a year - tap it to see.", focus: fz(pm.toggle, 1.4), ring: pad(pm.annual, 2), click: mid(pm.annual), duration: 6000 },
    { screen: "a", url: U.sub, caption: "Annual saves $25.89", detail: "$129.99 AUD a year, including GST (about $11.82). Next charge a year on, then yearly on the same date.", focus: fz(span(pa.toggle, pa.rowR["Price"]), 1.3), ring: pad(span(pa.rowR["Price"], pa.rowR["Next charge after that"]), 4), duration: 7500 },
    { screen: "a", url: U.sub, caption: "Back to Monthly", detail: "Sarah picks Monthly.", focus: fz(pa.toggle, 1.4), ring: pad(pa.monthly, 2), click: mid(pa.monthly), duration: 4500 },
    { screen: "m", url: U.sub, scroll: sF(pm.h, pm.summary), caption: "Exactly what you'll pay, and when", detail: "$12.99 AUD a month, GST included (about $1.18). Renews automatically. First charge today when you Subscribe, then 23 Dec 2026 and monthly on the same date.", focus: fz(pm.summary, 1.25), ring: pad(span(pm.rowR["Price"], pm.rowR["Next charge after that"]), 4), duration: 9000 },
    { screen: "m", url: U.sub, scroll: sF(pm.h, pm.summary), caption: "Cancel any time", detail: "Anytime on this page, one click.", focus: fz(pm.rowR["Cancel"], 1.5), ring: pad(pm.rowR["Cancel"], 4), duration: 5000 },
    // Discount code
    { screen: "m", url: U.sub, scroll: sF(pm.h, pm.input), caption: "Have a discount code?", detail: "Type it in here - it's checked as you type.", focus: fz(span(pm.codeLabel, pm.input), 1.5), ring: pad(pm.input, 3), click: mid(pm.input), duration: 5500 },
    { screen: "type", url: U.sub, scroll: sF(pt.h, pt.input), caption: "adulting101", detail: "The code for a free first month.", focus: fz(span(pt.codeLabel, pt.input), 1.5), ring: pad(pt.input, 3), duration: 4500 },
    { screen: "promo", url: U.sub, scroll: sF(pp.h, pp.msg), caption: "✓ Code applied. Your first month is free.", detail: "A code that isn't right says \"Code isn't recognised\". Each account gets one promotional trial - a second go says it's already been used.", focus: fz(span(pp.input, pp.msg), 1.5), ring: pad(span(pp.input, pp.msg), 4), duration: 7000 },
    { screen: "promo", url: U.sub, scroll: sF(pp.h, pp.summary), caption: "The dates move to match", detail: "First charge: free for your first month - card charged on 23 Dec 2026 unless you cancel. Next charge after that 23 Jan 2027, then monthly.", focus: fz(span(pp.rowR["First charge"], pp.rowR["Next charge after that"]), 1.4), ring: pad(span(pp.rowR["First charge"], pp.rowR["Next charge after that"]), 4), duration: 8500 },
    { screen: "promo", url: U.sub, scroll: sF(pp.h, pp.note), caption: "If you cancel", detail: "You keep access until the end of the month you've paid for, then it simply stops - no more charges. Your account and data stay; deleting your account is separate, in Settings.", focus: fz(pp.note, 1.3), ring: pad(pp.note, 3), duration: 8500 },
    { screen: "promo", url: U.sub, scroll: atSub, caption: "Start my free month", detail: "Without a code it says Subscribe — $12.99 / month. Clicking it agrees to the Terms & Conditions and Privacy Policy linked underneath; your card goes in next.", focus: fz(span(pp.btn, pp.terms), 1.3), ring: pad(pp.btn, 3), click: mid(pp.btn), duration: 8000 },
    // The Stripe popup
    { screen: "dlg", url: U.sub, scroll: atSub, caption: "Subscribe to TAL Premium", detail: "A secure Stripe popup: \"First month free, then $12.99 monthly\". Pay by card, or Apple Pay or Google Pay where your phone or browser has it.", focus: dlgFocus(ds.r, 1.3), ring: pad(ds.tabs, 3), duration: 8000 },
    { screen: "dlgType", url: U.sub, scroll: atSub, caption: "Card number, expiry, security code", detail: "Country is already Australia. Your card goes straight to Stripe - The Adulting Life never sees or stores the number.", focus: dlgFocus(ds.r, 1.3), ring: pad(ds.fields, 3), duration: 8000 },
    { screen: "dlgType", url: U.sub, scroll: atSub, caption: "Subscribe", detail: "Cancel closes it with nothing charged.", focus: dlgFocus(ds.r, 1.3), ring: pad(ds.submit, 3), click: mid(ds.submit), duration: 4500 },
    { screen: "dlgBusy", url: U.sub, scroll: atSub, caption: "Processing…", detail: "If your bank wants to check it's you, its approval screen pops up here first.", focus: dlgFocus(dsb.r, 1.3), ring: pad(dsb.submit, 3), duration: 5500 },
    { screen: "dlgDone", url: U.sub, scroll: atSub, caption: "You're subscribed — enjoy your free month!", detail: "Done, and the page updates straight away.", focus: dlgFocus(dsd.r, 1.5), ring: pad(span(dsd.tick, dsd.msg), 6), click: mid(dsd.done), duration: 6000 },
    { screen: "trial", url: U.sub, caption: "Free trial", detail: "Started today, free trial ends 23 Dec 2026, and the card on file. The free month shows in Billing history as a $0.00 invoice.", focus: fz(span(lt.planCard, lt.rows[0]), P ? 1 : 1.1), ring: pad(span(lt.badge, lt.next), 4), duration: 8000 },
    // Subscribed for a while
    { screen: "act", url: U.sub, caption: "A few months in", detail: "Here's how it looks once you've been subscribed a while. TAL Premium — Monthly, $12.99 AUD / month, and the ACTIVE badge.", focus: fz(lt.planCard, P ? 1.04 : 1.25), ring: pad(span(la.name, la.badge), 4), duration: 7500 },
    { screen: "act", url: U.sub, caption: "Started, and next billing date", detail: "Subscribed on 14 Jun 2026. The next $12.99 comes out on 14 Dec 2026.", focus: fz(span(la.started, la.next), P ? 1.5 : 1.6), ring: pad(span(la.started, la.next), 4), duration: 6500 },
    { screen: "act", url: U.sub, scroll: atCard, caption: "Payment method", detail: "The card it's charged to - Visa ending 4242, expiring 08/28. New card? Change card.", focus: fzs(pad(span(la.cardText, la.change), 20), P ? 1.6 : 1.8), ring: pad(la.change, 3), click: mid(la.change), duration: 6500 },
    { screen: "upd", url: U.sub, scroll: atCard, caption: "Change your card", detail: "The same secure Stripe popup - card, Apple Pay or Google Pay.", focus: dlgFocus(du.r, 1.3), ring: pad(du.head, 2), duration: 5500 },
    { screen: "updType", url: U.sub, scroll: atCard, caption: "The new card, then Save card", detail: "Nothing is charged now - the next payment comes off the new card.", focus: dlgFocus(du.r, 1.3), ring: pad(du.fields, 3), click: mid(du.submit), duration: 8000 },
    { screen: "updDone", url: U.sub, scroll: atCard, caption: "Your card has been updated.", detail: "", focus: dlgFocus(dud.r, 1.5), ring: pad(span(dud.tick, dud.msg), 6), click: mid(dud.done), duration: 4500 },
    { screen: "act2", url: U.sub, scroll: atCard, caption: "Mastercard ending 3376", detail: "Shown straight away, with its expiry.", focus: fzs(pad(span(la2.cardText, la2.change), 20), P ? 1.5 : 1.8), ring: pad(la2.cardText, 4), duration: 5000 },
    // Billing history
    { screen: "act2", url: U.sub, scroll: sF(la2.h, la2.billCard), caption: "Billing history", detail: "Every payment, newest first - one a month since June.", focus: fz(la2.billCard, P ? 1 : 1.15), ring: pad(la2.billCard, 2), duration: 6000 },
    { screen: "act2", url: U.sub, scroll: sF(la2.h, la2.rows[0]), caption: "Each invoice", detail: "The date, the invoice number, the amount and PAID. View opens the invoice.", focus: fzs(pad(la2.rows[0], 16), P ? 1.15 : 1.5), ring: pad(la2.rows[0], 3), click: mid(r0(la2).view), duration: 7000 },
    { screen: "hosted", url: U.inv, caption: "The invoice, on Stripe", detail: "Opens in a new tab: paid 14 November 2026, the invoice number and the card. Download invoice or Download receipt for your records.", focus: P ? { x: 195, y: hl.card.y + hl.card.h / 2, scale: 1.04 } : { x: 600, y: hl.card.y + hl.card.h / 2 - 20, scale: 1.25 }, ring: pad(hl.details, 4), duration: 8500 },
    { screen: "act2", url: U.sub, scroll: sF(la2.h, la2.rows[0]), caption: "PDF", detail: "Or straight to the PDF.", focus: fzs(pad(la2.rows[0], 16), P ? 1.15 : 1.5), ring: pad(r0(la2).pdf, 4), click: mid(r0(la2).pdf), duration: 4500 },
    { screen: "pdf", url: U.pdf, caption: "The invoice PDF", detail: "From The Adulting Life to Sarah Taylor: TAL Premium — Monthly, 14 Nov – 14 Dec 2026, $12.99 AUD paid. Save it or print it.", focus: P ? { x: 195, y: pl.page.y + pl.page.h / 2, scale: 1.04 } : { x: 600, y: 330, scale: 1.25 }, ring: pl.page, duration: 8500 },
    // Danger zone
    { screen: "act2", url: U.sub, scroll: sF(la2.h, la2.danger!.box), caption: "Danger zone", detail: "Cancel any time - you keep access until the end of the billing period you've paid for.", focus: fz(la2.danger!.box, 1.3), ring: pad(la2.danger!.link, 3), click: mid(la2.danger!.link), duration: 6500 },
    { screen: "conf", url: U.sub, scroll: sF(lc.h, lc.danger!.confirm!), caption: "It checks first", detail: "Yes, cancel stops it renewing. Keep subscription leaves it as it is.", focus: fz(lc.danger!.confirm!, 1.3), ring: pad(lc.danger!.yes!, 3), click: mid(lc.danger!.yes!), duration: 7000 },
    { screen: "canc", url: U.sub, caption: "Cancelled - access until 14 Dec 2026", detail: "No more charges. Everything keeps working until the period you've paid for runs out - then it doesn't renew.", focus: fz(span(lx.badge, lx.next), P ? 1.3 : 1.4), ring: pad(span(lx.badge, lx.next), 4), duration: 7500 },
    { screen: "canc", url: U.sub, scroll: sF(lx.h, lx.resume!.box), caption: "Changed your mind?", detail: "Resume subscription before then and it keeps renewing - no new card needed.", focus: fz(lx.resume!.box, 1.3), ring: pad(lx.resume!.btn, 3), click: mid(lx.resume!.btn), duration: 7000 },
    { screen: "act2", url: U.sub, caption: "Active again", detail: "Next billing date 14 Dec 2026, as before.", focus: fz(span(la2.badge, la2.next), P ? 1.3 : 1.4), ring: pad(span(la2.badge, la2.next), 4), duration: 5000 },
    // Failed payment
    { screen: "fail", url: U.sub, caption: "If a payment fails", detail: "A red banner across the top of every page: you've 7 days to update your card. Everything keeps working until then.", focus: P ? { x: 195, y: bannerRect(v, "failed").y + 60, scale: 1.06 } : { x: 720, y: 160, scale: 1.25 }, ring: pad(bannerRect(v, "failed"), 2), duration: 8000 },
    { screen: "fail", url: U.sub, scroll: sF(lf.h, lf.change), caption: "Payment failed", detail: "Update card in the banner brings you here. Change card, and the payment is tried again straight away.", focus: fz(span(lf.failNote!, lf.change), P ? 1.04 : 1.2), ring: pad(lf.change, 3), click: mid(lf.change), duration: 7500 },
    // View-only
    { screen: "ended", url: U.sub, caption: "No subscription? View-only", detail: "From 1 Dec 2026, an account without a subscription is view-only. Your information is safe - you can still see, download and print all of it.", focus: P ? { x: 195, y: bannerRect(v, "viewOnly").y + 80, scale: 1.06 } : { x: 720, y: 140, scale: 1.25 }, ring: pad(bannerRect(v, "viewOnly"), 2), duration: 8500 },
    { screen: "ended", url: U.sub, caption: "Subscribe to keep adding and editing", detail: "Adding, changing, uploading and the AI features need a subscription - try one and a \"Subscribe to keep adding and editing\" box pops up. Choose a plan here to restart.", focus: fz(span(pe.endedBox!, pe.toggle), P ? 1.04 : 1.2), ring: pad(pe.endedBox!, 3), duration: 9000 },
    // Round buttons
    { screen: "fabs", url: U.sub, caption: "Two round buttons", detail: "? opens help for this page. Tap the tour button any time to watch this again - you're watching it now.", focus: P ? { x: 270, y: 780, scale: 1.5 } : { x: 1050, y: 640, scale: 1.8 }, ring: { x: fab.right - 128, y: fab.y, w: 128, h: 56 }, click: { x: fab.right - 100, y: fab.y + 28 }, duration: 7000 },
  ]
  return { screens, steps }
}

const D = build(DV)
const PH = build(PV)

export default function SubscriptionPageWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  const b = phone ? PH : D
  return (
    <WalkthroughPlayer key={dev} device={dev} steps={b.steps} screens={b.screens}
      title={phone ? "Subscription (phone)" : "Subscription (computer)"} url={U.sub} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "Your subscription", subtitle: "Pick a plan, add your card with Stripe, see every invoice - and cancel or resume any time" }} />
  )
}
