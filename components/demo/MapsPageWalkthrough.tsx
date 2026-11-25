"use client"

// "Maps" page walkthrough - the walkthrough (tour) button on /maps
// (components/demo/PageWalkthroughFab). Hand-built copies of the real screens
// with a made-up family's sample data (the Taylors, Brisbane) - no sign-in, no
// API calls. "Today" is Mon 23 Nov 2026. Two versions (docs/Demo-Walkthroughs.md,
// rule 2):
//   computer - 1200 x 760, the sidebar + header layout (md and up)
//   phone    - 390 x 844, the mobile layout (header with logo, TAL AI, bell,
//              avatar, hamburger; single column)
// The real page shows a Google map (MapsClient loads the Google Maps JS API
// with NEXT_PUBLIC_GOOGLE_MAP_API). This walkthrough never loads map tiles or
// screenshots - the map here is a simple drawing (soft streets, parks, a
// river) of a made-up corner of Brisbane, with the street names invented.
// Covers everything on /maps: the breadcrumb, the plum header with its count,
// the map fitted to every pin (lib/services/map-locations: every answer to an
// 'address' question across the family, plotted only when it has lat/lon),
// clicking each pin (the info window: folder name, field label · whose record,
// address), closing it, + / - zoom, full screen (computer only - iPhones don't
// offer it), "List all N locations", and how a pin gets there - an Address
// field in a folder (AddressInput: Google Places suggestions, AU / NZ only,
// the lat, lon line under it once picked) - then the new pin, the empty state
// and the two round buttons.
// Copies: app/(app)/maps/page.tsx, app/(app)/maps/MapsClient.tsx,
// lib/services/map-locations.ts, components/AddressInput.tsx, and the folder
// page (records/[category]/[subcategory] + FolderNotes + PageForm) for List of
// Medical Advisers (page_questions doctor.* from migrations 060 / 194 / 195).
// The shell and round buttons are copied from SettingsPageWalkthrough.
// If one of those changes, update the matching screen here.

import { useEffect, useState, type ReactNode } from "react"
import WalkthroughPlayer, { type WalkStep } from "./WalkthroughPlayer"
import { useWalkthroughView, type WalkthroughDevice } from "./useWalkthroughDevice"

type Rect = { x: number; y: number; w: number; h: number }
type Pt = { x: number; y: number }

const Box = ({ x, y, w, h, children, className = "", style }: { x: number; y: number; w: number; h: number; children?: ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`absolute ${className}`} style={{ left: x, top: y, width: w, height: h, ...style }}>{children}</div>
)
const Img = ({ src, x, y, w, h, className = "rounded-xl" }: { src: string; x: number; y: number; w: number; h?: number; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className={`absolute object-cover ${className}`} style={{ left: x, top: y, width: w, height: h ?? w }} />
)

// Types the text out a letter at a time, each time its screen appears.
function Typed({ text, delay = 700, speed = 90 }: { text: string; delay?: number; speed?: number }) {
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
// Shows its children after `ms` (the suggestions list once the typing's done).
function Later({ ms, children }: { ms: number; children: ReactNode }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOn(true), ms); return () => clearTimeout(t) }, [ms])
  return on ? <>{children}</> : null
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
const CW = 6.9
const tl = (t: string, w: number) => wrapLines(t, w, CW) * 20

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
const NAV_MAPS = 13
const NAV_ORGANISER = 2
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
const PdfGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><text x="8" y="17" fontSize="6" fontWeight="700" fill="currentColor">PDF</text></svg>
)
const MailGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
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

const SB = 240
const navY = (k: number) => 168 + k * 41
const SEARCH = { x: 264, y: 12, w: 384, h: 40 }
const ADD = { x: 656, y: 12, w: 84, h: 40 }
const ASK = { x: 850, y: 12, w: 128, h: 40 }
const BELL = { x: 986, y: 12, w: 40, h: 40 }
const USER = { x: 1042, y: 14, w: 134, h: 36 }
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
const Shell = ({ v, h, nav = NAV_MAPS, children }: { v: V; h: number; nav?: number; children: ReactNode }) =>
  v.phone ? <PShell h={h}>{children}</PShell> : <DShell h={h} nav={nav}>{children}</DShell>

// ── Sample places (the Taylors of Brisbane) ──────────────────────────────────
// One row per answer to an 'address' question, as listFamilyMapLocations
// returns them: the folder's name (subcategories.name), the question's label,
// whose record it's saved in, and the address the Places picker stored (its
// formatted_address, so ", Australia" on the end). `p` is where it sits on the
// drawn map. Street names are made up.

type Loc = { sub: string; q: string; who: string; a: string; p: Pt }
const LOCS: Loc[] = [
  { sub: "Home Insurance", q: "Insured property address", who: "Sarah Taylor", a: "12 Jacaranda St, Ashgrove QLD 4060, Australia", p: { x: 640, y: 400 } },
  { sub: "Primary Education", q: "School address", who: "Leo Taylor", a: "8 Banksia Ave, Ashgrove QLD 4060, Australia", p: { x: 520, y: 330 } },
  { sub: "Secondary Education", q: "School address", who: "Mia Taylor", a: "45 Hillcrest Rd, Bardon QLD 4065, Australia", p: { x: 420, y: 590 } },
  { sub: "List of Medical Advisers", q: "Address", who: "Sarah Taylor", a: "220 Riverbend Rd, Milton QLD 4064, Australia", p: { x: 1000, y: 830 } },
  { sub: "Emergency Contacts", q: "Address", who: "Sarah Taylor", a: "3 Fig Tree Ln, Red Hill QLD 4059, Australia", p: { x: 960, y: 430 } },
  { sub: "ABN", q: "Business address", who: "James Taylor", a: "17 Wharf St, Paddington QLD 4064, Australia", p: { x: 940, y: 610 } },
  { sub: "Home / Property – Rent", q: "Property address", who: "James Taylor", a: "6/31 Riverview Tce, Toowong QLD 4066, Australia", p: { x: 650, y: 880 } },
]
const NEW_LOC: Loc = { sub: "List of Medical Advisers", q: "Address", who: "Sarah Taylor", a: "14 Wattle St, Paddington QLD 4064, Australia", p: { x: 820, y: 700 } }
const LOCS8 = [...LOCS, NEW_LOC]
const POP_DETAIL = [
  "Sarah's home, from the Insured property address in her Home Insurance folder.",
  "Leo's primary school - the School address in his Primary Education folder.",
  "Mia's high school, from her Secondary Education folder.",
  "Their GP - the Address in Sarah's List of Medical Advisers.",
  "Emma Clarke's house - Sarah's sister and next of kin, saved in Sarah's Emergency Contacts. The name is whose record it's in, not who lives there.",
  "James's workplace - the Business address in his ABN folder.",
  "The property in James's Home / Property – Rent folder.",
]

// ── The drawn map ────────────────────────────────────────────────────────────
// A view is the world point at the centre of the map box and its scale
// (screen px per world unit). `fit` copies map.fitBounds over every pin.

type View = { cx: number; cy: number; s: number }
function fitView(r: { w: number; h: number }, locs: Loc[]): View {
  const xs = locs.map((l) => l.p.x), ys = locs.map((l) => l.p.y)
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys) - 60, y1 = Math.max(...ys)
  const s = Math.min((r.w - 120) / (x1 - x0), (r.h - 120) / (y1 - y0))
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, s }
}
/** A world point on screen, relative to the map box. */
const toBox = (r: { w: number; h: number }, vw: View, p: Pt) => ({ x: r.w / 2 + (p.x - vw.cx) * vw.s, y: r.h / 2 + (p.y - vw.cy) * vw.s })

const PIN_W = 27, PIN_H = 43
// Google's InfoWindow: a close row, then MapsClient's content (max-width 260).
function infoSize(r: { w: number }, l: Loc) {
  const w = Math.min(288, r.w - 24)
  const cw = w - 24
  const sub = wrapLines(`${l.q} · ${l.who}`, cw, 6.2) * 16
  const addr = wrapLines(l.a, cw, 6.8) * 18
  return { w, h: 30 + 20 + 2 + sub + 6 + addr + 14 }
}
/** Opening an info window pans the map so it fits, like Google's does. */
function panFor(r: { w: number; h: number }, vw: View, l: Loc, rightPad = 60): View {
  const p = toBox(r, vw, l.p)
  const sz = infoSize(r, l)
  let dx = 0, dy = 0
  const top = p.y - PIN_H - 12 - sz.h
  if (top < 12) dy = 12 - top
  if (p.y + dy > r.h - 16) dy = r.h - 16 - p.y
  const left = p.x - sz.w / 2, right = p.x + sz.w / 2
  if (left < 12) dx = 12 - left
  else if (right > r.w - rightPad) dx = r.w - rightPad - right
  return { ...vw, cx: vw.cx - dx / vw.s, cy: vw.cy - dy / vw.s }
}

function MapArt({ w, h, vw }: { w: number; h: number; vw: View }) {
  const vbw = w / vw.s, vbh = h / vw.s
  const f = (px: number) => px / vw.s // text that stays the same size on screen
  const streets: ReactNode[] = []
  // Soft grids of side streets, a few blocks each, at slightly different angles.
  const grids: [number, number, number, number, number, number][] = [
    // x, y, w, h, gap, angle
    [300, 150, 600, 420, 70, -12], [820, 250, 520, 420, 64, 8], [250, 520, 450, 380, 66, 18],
    [700, 560, 560, 330, 60, -6], [-300, 100, 500, 500, 80, 0], [1300, 400, 600, 500, 72, -15], [500, 1150, 900, 400, 80, 5],
  ]
  grids.forEach(([gx, gy, gw, gh, gap, a], k) => {
    const cx = gx + gw / 2, cy = gy + gh / 2
    const lines: ReactNode[] = []
    for (let x = gx; x <= gx + gw; x += gap) lines.push(<line key={`v${x}`} x1={x} y1={gy} x2={x} y2={gy + gh} />)
    for (let y = gy; y <= gy + gh; y += gap * 1.3) lines.push(<line key={`h${y}`} x1={gx} y1={y} x2={gx + gw} y2={y} />)
    streets.push(<g key={k} transform={`rotate(${a} ${cx} ${cy})`}>{lines}</g>)
  })
  const label = (x: number, y: number, t: string, size: number, cls: string, rot = 0) => (
    <text x={x} y={y} fontSize={f(size)} className={cls} textAnchor="middle" transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}>{t}</text>
  )
  return (
    <svg className="absolute inset-0" width={w} height={h} viewBox={`${vw.cx - vbw / 2} ${vw.cy - vbh / 2} ${vbw} ${vbh}`} preserveAspectRatio="none" aria-hidden>
      <rect x={-1000} y={-1000} width={4000} height={4000} fill="#eef0e6" />
      {/* Parks */}
      <path d="M-500 300 C -300 220 -60 260 60 380 C 150 470 120 640 20 720 C -120 820 -380 800 -500 700 Z" fill="#d3e8c7" />
      <path d="M300 650 C 340 610 420 620 450 660 C 480 710 450 760 390 770 C 330 775 280 720 300 650 Z" fill="#d3e8c7" />
      <path d="M1060 330 C 1110 300 1180 320 1190 370 C 1200 420 1150 450 1100 440 C 1050 430 1030 370 1060 330 Z" fill="#d3e8c7" />
      <path d="M760 470 C 800 455 850 470 850 505 C 850 540 800 550 770 535 C 745 520 740 485 760 470 Z" fill="#d3e8c7" />
      {/* Side streets */}
      <g stroke="#ffffff" strokeWidth={f(2.5)} opacity="0.9">{streets}</g>
      {/* River */}
      <path d="M-600 1300 C -200 1080 200 1120 450 1100 C 700 1080 820 990 1050 960 C 1300 930 1450 1060 1700 1120 C 1900 1170 2100 1100 2400 1050"
        fill="none" stroke="#bcd8ec" strokeWidth={70} strokeLinecap="round" />
      {/* Main roads */}
      <g fill="none" strokeLinecap="round">
        {["M-500 180 C 100 230 400 330 700 440 C 1000 540 1400 600 2300 700",
          "M480 -500 C 540 0 610 300 700 600 C 760 800 800 950 860 1250",
          "M1500 -400 C 1300 100 1150 400 1020 640 C 940 780 900 900 880 1200",
          "M-500 1050 C 0 960 400 1000 700 980 C 950 960 1050 880 1250 880 C 1500 880 1800 960 2300 940"].map((d) => (
          <g key={d}><path d={d} stroke="#e6dcbc" strokeWidth={f(9)} /><path d={d} stroke="#fffdf4" strokeWidth={f(6)} /></g>
        ))}
      </g>
      {/* Labels */}
      <g fill="#8d9384" fontWeight={600} letterSpacing={f(1.5)}>
        {label(560, 260, "ASHGROVE", 11, "")}
        {label(300, 500, "BARDON", 11, "")}
        {label(1080, 500, "RED HILL", 11, "")}
        {label(860, 760, "PADDINGTON", 11, "")}
        {label(1150, 800, "MILTON", 11, "")}
        {label(520, 860, "TOOWONG", 11, "")}
      </g>
      <g fill="#a2a796">
        {label(240, 300, "Jacaranda St", 9, "", 14)}
        {label(640, 700, "Hillcrest Rd", 9, "", 70)}
        {label(1180, 600, "Wharf St", 9, "", -60)}
        {label(1400, 905, "Riverbend Rd", 9, "")}
        {label(375, 700, "Wattle Park", 9, "")}
        {label(1125, 380, "Fig Tree Reserve", 9, "")}
        {label(-200, 520, "Bushland Reserve", 9, "")}
      </g>
      <g fill="#7fa9c8" fontStyle="italic">{label(820, 1010, "River", 10, "", -8)}</g>
    </svg>
  )
}
// Google's default red marker.
const Marker = () => (
  <svg width={PIN_W} height={PIN_H} viewBox="0 0 27 43" aria-hidden>
    <path d="M13.5 1C6.6 1 1 6.6 1 13.5 1 23 13.5 42 13.5 42S26 23 26 13.5C26 6.6 20.4 1 13.5 1Z" fill="#EA4335" stroke="#B31412" strokeWidth="1.2" />
    <circle cx="13.5" cy="13.5" r="4.6" fill="#7a1209" />
  </svg>
)
function MapBox({ r, vw, locs, pop, phone, full, className = "rounded-2xl border border-tal-line" }: { r: Rect; vw: View; locs: Loc[]; pop?: number; phone?: boolean; full?: boolean; className?: string }) {
  const iw = pop !== undefined ? infoSize(r, locs[pop]) : undefined
  const pp = pop !== undefined ? toBox(r, vw, locs[pop].p) : undefined
  const ix = pp && iw ? Math.max(8, Math.min(r.w - iw.w - 8, pp.x - iw.w / 2)) : 0
  return (
    <Box {...r} className={`overflow-hidden bg-white ${className}`}>
      <MapArt w={r.w} h={r.h} vw={vw} />
      {locs.map((l, k) => {
        const p = toBox(r, vw, l.p)
        return <Box key={k} x={p.x - PIN_W / 2} y={p.y - PIN_H} w={PIN_W} h={PIN_H} style={{ filter: "drop-shadow(0 2px 1.5px rgba(0,0,0,0.25))" }}><Marker /></Box>
      })}
      {pop !== undefined && pp && iw && (
        <>
          <Box x={pp.x - 9} y={pp.y - PIN_H - 13} w={18} h={10} className="bg-white" style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
          <Box x={ix} y={pp.y - PIN_H - 12 - iw.h} w={iw.w} h={iw.h} className="rounded-lg bg-white shadow-[0_2px_7px_1px_rgba(0,0,0,0.3)]">
            <span className="absolute right-2 top-1.5 flex h-6 w-6 items-center justify-center text-[#666]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
            </span>
            <div className="px-3 pt-[30px]" style={{ fontFamily: "system-ui, sans-serif" }}>
              <div style={{ fontWeight: 600, color: "#4a2660", marginBottom: 2, fontSize: 14, lineHeight: "20px" }}>{locs[pop].sub}</div>
              <div style={{ fontSize: 12, color: "#7b6689", marginBottom: 6, lineHeight: "16px" }}>{locs[pop].q} · {locs[pop].who}</div>
              <div style={{ fontSize: 13, color: "#333", lineHeight: "18px" }}>{locs[pop].a}</div>
            </div>
          </Box>
        </>
      )}
      {/* Map controls: full screen (not on iPhone) and zoom */}
      {!phone && (
        <Box x={r.w - 50} y={10} w={40} h={40} className="flex items-center justify-center rounded-sm bg-white text-[#666] shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
          {full
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" stroke="currentColor" strokeWidth="2.4" /></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" stroke="currentColor" strokeWidth="2.4" /></svg>}
        </Box>
      )}
      <Box x={r.w - 50} y={r.h - 24 - 81} w={40} h={81} className="flex flex-col items-center rounded-sm bg-white text-[#666] shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
        <span className="flex h-10 w-10 items-center justify-center"><PlusIcon size={18} w={3} /></span>
        <span className="h-px w-[30px] bg-[#e6e6e6]" />
        <span className="flex h-10 w-10 items-center justify-center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></span>
      </Box>
    </Box>
  )
}
const mapCtl = (r: Rect) => ({
  fs: { x: r.x + r.w - 50, y: r.y + 10, w: 40, h: 40 },
  zin: { x: r.x + r.w - 50, y: r.y + r.h - 105, w: 40, h: 40 },
  zout: { x: r.x + r.w - 50, y: r.y + r.h - 64, w: 40, h: 40 },
})

// ── Maps page layout (maps/page.tsx + MapsClient) ────────────────────────────

const intro = (n?: number) => `Every address saved across your family's records, plotted on a single map.${n ? ` Showing ${n} locations.` : ""}`
const EMPTY = "No addresses saved yet. As you fill in addresses across your Organiser folders — property, rental, employer, insurance and more — they'll appear here as pins on a map."
const LIST_ROW = 20 + 16 + 2 + 20

function mapsLayout(v: V, o: { n?: number; open?: boolean; empty?: boolean } = {}) {
  const n = o.empty ? 0 : (o.n ?? 7)
  const crumb = { x: v.x, y: v.top, w: 200, h: 20 }
  const banner = { x: v.x, y: v.top + 32, w: v.w, h: 16 + 32 + 4 + tl(intro(n), v.w - 40) + 16 }
  const my = banner.y + banner.h + 16
  if (o.empty) {
    const empty = { x: v.x, y: my, w: v.w, h: 48 + tl(EMPTY, v.w - 48) }
    return { n, crumb, banner, map: empty, empty, det: empty, rows: [] as Rect[], summary: empty, h: Math.max(v.H, empty.y + empty.h + 24) }
  }
  const map = { x: v.x, y: my, w: v.w, h: Math.max(500, Math.round(v.H * 0.7)) }
  const dy = map.y + map.h + 12
  const summary = { x: v.x + 16, y: dy + 16, w: 190, h: 20 }
  const rows: Rect[] = []
  let y = dy + 16 + 20 + 12
  if (o.open) for (let k = 0; k < n; k++) { rows.push({ x: v.x + 16, y, w: v.w - 32, h: LIST_ROW }); y += LIST_ROW + 8 }
  const det = { x: v.x, y: dy, w: v.w, h: o.open ? y - 8 + 16 - dy : 52 }
  return { n, crumb, banner, map, empty: undefined, det, rows, summary, h: Math.max(v.H, det.y + det.h + (v.phone ? 112 : 96)) }
}

function Maps({ v, n = 7, open, empty, pop, vw, fabs }: { v: V; n?: number; open?: boolean; empty?: boolean; pop?: number; vw?: View; fabs?: boolean }) {
  const L = mapsLayout(v, { n, open, empty })
  const locs = n === 8 ? LOCS8 : LOCS
  const view = vw ?? fitView(L.map, locs)
  const fab = FAB(v)
  return (
    <Shell v={v} h={L.h}>
      <Box {...L.crumb} className="flex items-center gap-2 text-sm"><span className="text-tal-plum-soft">Dashboard</span><span className="text-tal-plum-soft/50">/</span><span className="text-tal-plum-soft">Maps</span></Box>
      <Box {...L.banner} className="rounded-2xl bg-tal-plum px-5 py-4 text-white shadow-md">
        <h1 className="font-display text-2xl leading-8">Maps</h1>
        <p className="mt-1 text-sm leading-5 text-white/80">Every address saved across your family&apos;s records, plotted on a single map.{!empty && <>{" "}Showing <span className="font-medium">{n}</span> locations.</>}</p>
      </Box>
      {empty && L.empty ? (
        <Box {...L.empty} className="rounded-2xl border border-dashed border-tal-line bg-white p-6 text-sm leading-5 text-tal-plum-soft">{EMPTY}</Box>
      ) : (
        <>
          <MapBox r={L.map} vw={view} locs={locs} pop={pop} phone={v.phone} />
          <Box {...L.det} className="rounded-2xl border border-tal-line bg-white text-sm" />
          <Box {...L.summary} className="flex items-center gap-1.5 font-medium text-tal-plum"><span className={`text-[10px] ${open ? "rotate-90" : ""}`}>▶</span>List all {n} locations</Box>
          {open && L.rows.map((r, k) => (
            <Box key={k} {...r} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tal-plum text-[10px] text-white">{k + 1}</span>
              <div className="min-w-0">
                <div className="font-medium leading-5 text-tal-plum">{locs[k].sub}</div>
                <div className="text-xs leading-4 text-tal-plum-soft">{locs[k].q} · {locs[k].who}</div>
                <div className="mt-0.5 truncate text-sm leading-5 text-tal-plum-soft">{locs[k].a}</div>
              </div>
            </Box>
          ))}
        </>
      )}
      {fabs && <Fabs {...fab} />}
    </Shell>
  )
}

// ── A folder's page: List of Medical Advisers (records/health/...) ───────────
// FolderNotes has no prompt for this folder, so it shows the generic one.
// Fields are page_questions doctor.* (060, Address / Mailing Address made
// 'address' in 194): label, col_start, col_span, row_order.

const NOTE = "Add a private note for your family — reminders, where the physical document lives, who to call."
const FIELDS: { l: string; c: number; s: number; r: number; addr?: boolean }[] = [
  { l: "Business Name", c: 1, s: 6, r: 1 }, { l: "Contact Name", c: 7, s: 6, r: 1 },
  { l: "Speciality / Role", c: 1, s: 6, r: 2 }, { l: "Phone Number", c: 7, s: 6, r: 2 },
  { l: "Email Address", c: 1, s: 6, r: 3 },
  { l: "Address", c: 1, s: 12, r: 4, addr: true }, { l: "Mailing Address", c: 1, s: 12, r: 5, addr: true },
]
const E1: Record<string, string> = {
  "Business Name": "Bayview Family Practice", "Contact Name": "Dr Priya Nair", "Speciality / Role": "GP", "Phone Number": "07 3555 0148",
  "Email Address": "reception@bayviewfp.example", Address: "220 Riverbend Rd, Milton QLD 4064, Australia",
}
const E1_COORDS = "-27.46790, 152.99894"
const E2: Record<string, string> = {
  "Business Name": "Paddington Dental", "Contact Name": "Dr Ben Okafor", "Speciality / Role": "Dentist", "Phone Number": "07 3555 0192",
  "Email Address": "hello@paddingtondental.example",
}
const E2_COORDS = "-27.46118, 153.00042"
const TYPED = "14 Wattle St"
const SUGGEST: [string, string][] = [
  ["14 Wattle St", "Paddington QLD, Australia"], ["14 Wattle St", "Milton QLD, Australia"],
  ["14 Wattle Ave", "Bardon QLD, Australia"], ["14 Wattle Rd", "Auckland, New Zealand"],
]
type FS = "base" | "new" | "filled" | "typing" | "picked"

function folderLayout(v: V, s: FS) {
  const P = v.phone, x = v.x, w = v.w
  const picker = P ? { x: 8, y: 142, w: 150, h: 34 } : { x: x + 268 + 44, y: 72, w: 150, h: 34 }
  const head = P ? { x, y: 188, w, h: 120 } : { x, y: 116, w, h: 72 }
  let y = head.y + head.h + 24
  const notes = { x, y, w, h: 20 + 28 + 8 + tl(NOTE, w - 40) + 20 }
  y += notes.h + 24
  const top = { x, y, w, h: 36 }
  y += 36 + 24
  const card = (entry: 1 | 2) => {
    const c = { x, y, w, h: 0 }
    const fx = x + 16, fw = w - 32
    let fy = y + 16 + 36 + 12
    const col = (fw - 11 * 16) / 12
    const coordsOn = (l: string) => l === "Address" && (entry === 1 || s === "picked")
    const fieldH = (l: string) => 16 + 4 + 44 + (coordsOn(l) ? 20 : 0)
    const rects: Record<string, Rect> = {}
    if (P) {
      for (const f of FIELDS) { rects[f.l] = { x: fx, y: fy, w: fw, h: fieldH(f.l) }; fy += fieldH(f.l) + 16 }
    } else {
      for (const row of [1, 2, 3, 4, 5]) {
        const fs = FIELDS.filter((f) => f.r === row)
        let rh = 0
        for (const f of fs) { rects[f.l] = { x: fx + (f.c - 1) * (col + 16), y: fy, w: f.s * col + (f.s - 1) * 16, h: fieldH(f.l) }; rh = Math.max(rh, fieldH(f.l)) }
        fy += rh + 16
      }
    }
    fy -= 16
    const save = { x: fx, y: fy + 16, w: 80, h: 40 }
    c.h = save.y + 40 + 16 - c.y
    y = c.y + c.h + 16
    const input = (l: string) => ({ x: rects[l].x, y: rects[l].y + 20, w: rects[l].w, h: 44 })
    return { box: c, rects, save, input }
  }
  const c1 = card(1)
  const c2 = s === "base" ? undefined : card(2)
  const add = { x, y: y - 16 + 24, w: 140, h: 40 }
  y = add.y + 40
  const sug = c2 ? { x: c2.input("Address").x, y: c2.input("Address").y + 46, w: Math.min(c2.input("Address").w, 420), h: SUGGEST.length * 44 + 2 } : undefined
  return { picker, head, notes, top, c1, c2, add, sug, h: Math.max(v.H, y + 120) }
}
type FLay = ReturnType<typeof folderLayout>

function Field({ r, l, val, coords, ph, typing }: { r: Rect; l: string; val?: string; coords?: string; ph?: string; typing?: boolean }) {
  return (
    <Box {...r}>
      <p className="mb-1 text-xs uppercase leading-4 tracking-wider text-tal-plum-soft">{l}</p>
      <div className={`flex h-11 items-center rounded-xl border bg-white px-3 text-sm ${typing ? "border-tal-plum ring-2 ring-tal-plum/20" : "border-tal-line"}`}>
        {typing ? <span className="truncate"><Typed text={TYPED} /></span> : val ? <span className="truncate">{val}</span> : <span className="truncate text-tal-plum-soft/50">{ph ?? ""}</span>}
      </div>
      {coords && <p className="mt-1 text-xs leading-4 text-tal-plum-soft">{coords}</p>}
    </Box>
  )
}
const PdfBtns = ({ phone }: { phone?: boolean }) => {
  const b = "inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"
  return (
    <>
      <span className={`${b} ${phone ? "w-9" : "px-3"}`}><PdfGlyph />{!phone && "Download PDF"}</span>
      <span className={`${b} ${phone ? "w-9" : "px-3"}`}><MailGlyph />{!phone && "Share PDF"}</span>
    </>
  )
}
function Card({ c, n, vals, coords, s, phone }: { c: NonNullable<FLay["c2"]>; n: number; vals: Record<string, string>; coords?: string; s: FS; phone?: boolean }) {
  return (
    <>
      <Box {...c.box} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={c.box.x + 16} y={c.box.y + 16} w={c.box.w - 32} h={36} className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-tal-plum-soft">Entry {n}</span>
        <span className="flex shrink-0 items-center gap-2">
          {!phone && <PdfBtns />}
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-tal-line bg-white text-red-700">🗑</span>
        </span>
      </Box>
      {FIELDS.map((f) => (
        <Field key={f.l} r={c.rects[f.l]} l={f.l}
          val={f.l === "Address" && n === 2 ? (s === "picked" ? NEW_LOC.a : undefined) : vals[f.l]}
          coords={f.l === "Address" ? coords : undefined}
          ph={f.addr ? "Start typing an address…" : undefined}
          typing={n === 2 && f.l === "Address" && s === "typing"} />
      ))}
      <Box {...c.save} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>
    </>
  )
}
function Folder({ v, s }: { v: V; s: FS }) {
  const L = folderLayout(v, s)
  const P = v.phone
  return (
    <Shell v={v} h={L.h} nav={NAV_ORGANISER}>
      <Box x={v.x} y={P ? 116 : 78} w={P ? v.w : L.picker.x - v.x} h={22} className="flex items-center gap-2 whitespace-nowrap text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">·</span><span>Health</span><span className="opacity-50">·</span></Box>
      <Box {...L.picker} className="flex items-center gap-2 rounded-full border-2 border-tal-plum/40 bg-white pl-2 pr-3 text-sm font-semibold shadow-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tal-plum/10 text-xs">👤</span><span className="flex-1 truncate">Sarah Taylor</span><span className="text-xs">▾</span>
      </Box>
      <Box x={L.picker.x + L.picker.w + 10} y={L.picker.y + 8} w={170} h={18} className="text-xs italic text-tal-plum-soft">click to switch person</Box>
      <Box {...L.head} className="rounded-2xl bg-black shadow-md" />
      <Img src="/thumbnails/subcategories/health.medical_advisers.webp" x={v.x + (P ? 12 : 20)} y={L.head.y + 12} w={48} className="rounded-xl bg-white ring-2 ring-white/20" />
      <Box x={v.x + (P ? 76 : 84)} y={L.head.y + 12} w={P ? v.w - 88 : 600} h={48} className="flex flex-col justify-center text-white">
        <p className="font-display leading-tight" style={{ fontSize: P ? 20 : 24 }}>List of Medical Advisers</p>
      </Box>
      <Box x={P ? v.x + 12 : v.x + v.w - 170} y={P ? L.head.y + 72 : L.head.y + 18} w={150} h={36} className="flex">
        <span className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-white px-3 text-sm font-medium text-tal-plum">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-emerald-700 text-[9px] font-bold text-white">X</span>Export to Excel
        </span>
      </Box>
      <Box {...L.notes} className="rounded-2xl border border-tal-line bg-amber-50/40 p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H16l4 4v10.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-13Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M15 4v5h5" stroke="currentColor" strokeWidth="1.7" /></svg></span><span className="font-display text-lg">Notes</span></span>
          <span className="text-xs text-tal-plum-soft underline">Add note</span>
        </div>
        <p className="text-sm leading-5 text-tal-plum-soft">{NOTE}</p>
      </Box>
      <Box {...L.top} className="flex items-center justify-end gap-2"><PdfBtns phone={P} /></Box>
      <Card c={L.c1} n={1} vals={E1} coords={E1_COORDS} s={s} phone={P} />
      {L.c2 && <Card c={L.c2} n={2} vals={s === "new" ? {} : E2} coords={s === "picked" ? E2_COORDS : undefined} s={s} phone={P} />}
      <Box {...L.add} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm font-medium">+ Add another</Box>
      {s === "typing" && L.sug && (
        <Later ms={700 + TYPED.length * 90 + 200}>
          <Box {...L.sug} className="overflow-hidden rounded-md border border-[#d9d9d9] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.3)]" style={{ fontFamily: "system-ui, sans-serif" }}>
            {SUGGEST.map(([a, b], k) => (
              <div key={k} className={`flex h-11 items-center gap-2 border-t border-[#e6e6e6] px-3 text-[13px] first:border-t-0 ${k === 0 ? "bg-[#ebf2fe]" : ""}`}>
                <svg width="12" height="16" viewBox="0 0 27 43" aria-hidden className="shrink-0"><path d="M13.5 1C6.6 1 1 6.6 1 13.5 1 23 13.5 42 13.5 42S26 23 26 13.5C26 6.6 20.4 1 13.5 1Z" fill="#9aa0a6" /><circle cx="13.5" cy="13.5" r="5" fill="#fff" /></svg>
                <span className="truncate"><b className="font-semibold text-[#333]">{a}</b> <span className="text-[#888]">{b}</span></span>
              </div>
            ))}
          </Box>
        </Later>
      )}
    </Shell>
  )
}

// ── Screens and steps (shared by both versions) ──────────────────────────────

const BASE = "app.theadultinglife.com.au"
const U = { maps: `${BASE}/maps`, folder: `${BASE}/records/health/health.medical_advisers` }

function build(v: V): { screens: Record<string, ReactNode>; steps: WalkStep[] } {
  const P = v.phone
  const sc = (h: number, y: number) => Math.max(0, Math.min(h - v.H, Math.round(y - v.H * 0.4)))
  const fz = (r: Rect, s: number) => ({ x: P ? 195 : r.x + r.w / 2, y: r.y + r.h / 2, scale: P ? Math.min(s, 1.06) : s })
  const fzs = (r: Rect, s: number) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, scale: s })

  const l0 = mapsLayout(v), lo = mapsLayout(v, { open: true }), l8 = mapsLayout(v, { n: 8 }), le = mapsLayout(v, { empty: true })
  const M = l0.map
  const fit = fitView(M, LOCS)
  const fit8 = fitView(l8.map, LOCS8)
  const zoom: View = { ...fit, s: fit.s * 2 }
  const FULL: Rect = { x: 0, y: 0, w: v.W, h: v.H }
  const fitFull = fitView(FULL, LOCS)
  const ctl = mapCtl(M), ctlF = mapCtl(FULL)
  // Each pin's info window, with the map panned so it fits.
  const pops = LOCS.map((l) => panFor(M, fit, l))
  const pop8 = panFor(l8.map, fit8, NEW_LOC)
  /** A pin's head on the page, in a view. */
  const pin = (r: Rect, vw: View, l: Loc): Pt => { const p = toBox(r, vw, l.p); return { x: r.x + p.x, y: r.y + p.y - 28 } }
  const pinRing = (r: Rect, vw: View, l: Loc): Rect => { const p = pin(r, vw, l); return { x: p.x - 18, y: p.y - 20, w: 36, h: 52 } }
  const infoRect = (vw: View, l: Loc, r: Rect = M): Rect => {
    const p = toBox(r, vw, l.p), sz = infoSize(r, l)
    const ix = Math.max(8, Math.min(r.w - sz.w - 8, p.x - sz.w / 2))
    return { x: r.x + ix, y: r.y + p.y - PIN_H - 12 - sz.h, w: sz.w, h: sz.h + 10 }
  }
  const closeX = (vw: View, l: Loc): Pt => { const r = infoRect(vw, l); return { x: r.x + r.w - 20, y: r.y + 18 } }
  // On a phone the map is taller than the space under the header, so it's scrolled into view.
  const sMap = P ? Math.round(M.y - 120) : 0
  const mapFocus = P ? { x: 195, y: M.y + M.h / 2, scale: 1 } : { x: M.x + M.w / 2, y: M.y + M.h / 2, scale: 1.08 }
  const popFocus = (vw: View, l: Loc) => { const r = infoRect(vw, l); return P ? { x: 195, y: r.y + r.h / 2 + 40, scale: 1.3 } : { x: Math.min(Math.max(r.x + r.w / 2, 380), 1000), y: r.y + r.h / 2 + 30, scale: 1.45 } }

  const lb = folderLayout(v, "base"), ln = folderLayout(v, "new"), lt = folderLayout(v, "typing"), lp = folderLayout(v, "picked")
  const c2n = ln.c2!, c2t = lt.c2!, c2p = lp.c2!
  const sAdd = sc(lb.h, lb.add.y)
  const sNew = sc(ln.h, c2n.box.y + 120)
  const sAddr = sc(lt.h, c2t.input("Address").y + 40)
  const sSave = sc(lp.h, c2p.save.y - 60)
  const sList = sc(lo.h, lo.det.y + 140)
  const fab = FAB(v)

  const screens: Record<string, ReactNode> = {
    maps: <Maps v={v} />,
    zoom: <Maps v={v} vw={zoom} />,
    full: <MapBox r={FULL} vw={fitFull} locs={LOCS} full className="" />,
    open: <Maps v={v} open />,
    folder: <Folder v={v} s="base" />,
    folderNew: <Folder v={v} s="new" />,
    folderFilled: <Folder v={v} s="filled" />,
    folderTyping: <Folder v={v} s="typing" />,
    folderPicked: <Folder v={v} s="picked" />,
    maps8: <Maps v={v} n={8} />,
    pop8: <Maps v={v} n={8} pop={7} vw={pop8} />,
    empty: <Maps v={v} empty />,
    fabs: <Maps v={v} fabs />,
  }
  LOCS.forEach((_, k) => { screens[`pop${k}`] = <Maps v={v} pop={k} vw={pops[k]} /> })

  const popSteps: WalkStep[] = LOCS.map((l, k) => {
    const last = k === LOCS.length - 1
    const nextClick = last ? closeX(pops[k], l) : pin(M, pops[k], LOCS[k + 1])
    return {
      screen: `pop${k}`, url: U.maps, scroll: sMap,
      caption: k === 0 ? `${l.sub} · ${l.q}` : `${l.sub}`,
      detail: k === 0
        ? `The pop-up says which folder it's from, the field, whose record it's in, and the address. ${POP_DETAIL[0]}`
        : last ? `${POP_DETAIL[k]} The × closes the pop-up.` : POP_DETAIL[k],
      focus: popFocus(pops[k], l), ring: infoRect(pops[k], l), click: nextClick, duration: k === 0 ? 8500 : 6500,
    }
  })

  const steps: WalkStep[] = [
    // The page
    { screen: "maps", url: U.maps, caption: "Maps: every address, on one map", detail: P ? "Open it from the ☰ menu. Every address saved anywhere in your family's records, as pins on one map." : "Open it from Maps at the bottom of the sidebar. Every address saved anywhere in your family's records, as pins on one map.", focus: P ? { x: 195, y: 200, scale: 1.04 } : { x: 600, y: 300, scale: 1.1 }, ring: P ? pad(P_MENU, 2) : { x: 12, y: navY(NAV_MAPS), w: 216, h: 37 }, duration: 7000 },
    { screen: "maps", url: U.maps, caption: "Showing 7 locations", detail: "The count of pins for the whole family. Dashboard, top left, takes you back.", focus: fz(span(l0.crumb, l0.banner), 1.3), ring: pad(span(l0.crumb, l0.banner), 4), duration: 6000 },
    { screen: "maps", url: U.maps, scroll: sMap, caption: "Each pin is a saved address", detail: "Nothing to set up - any Address field you fill in an Organiser folder lands here: the house, the schools, the GP, an emergency contact, a workplace, a property. (This map is a drawing - the real page shows a Google map.)", focus: mapFocus, ring: M, duration: 9000 },
    { screen: "maps", url: U.maps, scroll: sMap, caption: "Zoomed to fit everyone", detail: "It opens zoomed so every pin fits. A whole family's places at a glance - handy for school runs, appointments, or for someone stepping in to help.", focus: mapFocus, ring: span(pinRing(M, fit, LOCS[1]), pinRing(M, fit, LOCS[3])), duration: 7500 },
    { screen: "maps", url: U.maps, scroll: sMap, caption: "Click a pin", detail: "Here's Sarah and James's house in Ashgrove.", focus: P ? mapFocus : { ...pin(M, fit, LOCS[0]), scale: 1.5 }, ring: pinRing(M, fit, LOCS[0]), click: pin(M, fit, LOCS[0]), duration: 5500 },
    ...popSteps,
    // Zoom and full screen
    { screen: "maps", url: U.maps, scroll: sMap, caption: "Zoom in and out", detail: P ? "Tap + and −, or pinch with two fingers. Drag to move around." : "+ and −, bottom right - or scroll, or double-click. Drag to move around.", focus: P ? mapFocus : fzs(pad(span(ctl.zin, ctl.zout), 60), 1.6), ring: pad(span(ctl.zin, ctl.zout), 3), click: mid(ctl.zin), duration: 6000 },
    { screen: "zoom", url: U.maps, scroll: sMap, caption: "Closer in", detail: "Street by street. The pins stay the same size. − goes back out.", focus: mapFocus, ring: M, click: mid(ctl.zout), duration: 6500 },
    ...(P ? [] : [
      { screen: "maps", url: U.maps, caption: "Full screen", detail: "The square, top right, fills the whole screen with the map.", focus: fzs(pad(ctl.fs, 60), 1.7), ring: pad(ctl.fs, 3), click: mid(ctl.fs), duration: 5500 } as WalkStep,
      { screen: "full", url: U.maps, caption: "The map, full screen", detail: "Pins and pop-ups work the same. The button again (or Esc) brings the page back.", focus: { x: 600, y: 380, scale: 1 }, ring: pad(ctlF.fs, 3), click: mid(ctlF.fs), duration: 6500 } as WalkStep,
    ]),
    // The list
    { screen: "maps", url: U.maps, scroll: sc(l0.h, l0.det.y), caption: "List all 7 locations", detail: "Under the map - every pin, written out.", focus: fzs(pad(l0.summary, 40), P ? 1.5 : 1.7), ring: pad(l0.summary, 4), click: mid(l0.summary), duration: 5500 },
    { screen: "open", url: U.maps, scroll: sList, caption: "Every address, numbered", detail: "Folder, field, whose record, and the address - easy to read down, or to check nothing's missing.", focus: fz(pad(span(lo.rows[0], lo.rows[3]), 6), 1.2), ring: pad(lo.det, 2), duration: 7500 },
    { screen: "open", url: U.maps, scroll: sList, caption: "To change one, edit its folder", detail: "The map just shows what's saved. Their GP, number 4, is in Sarah's List of Medical Advisers - so to move a pin or add one, you go to the folder.", focus: fz(pad(lo.rows[3], 6), 1.4), ring: pad(lo.rows[3], 4), duration: 7500 },
    // How a pin gets there
    { screen: "folder", url: U.folder, caption: "Adding a place", detail: "Here's Sarah's List of Medical Advisers in the Organiser. The GP's Address is filled in - the numbers under it are where it is on the map.", focus: fz(lb.c1.rects.Address, P ? 1.06 : 1.3), ring: pad(lb.c1.rects.Address, 4), scroll: sc(lb.h, lb.c1.rects.Address.y), duration: 8000 },
    { screen: "folder", url: U.folder, scroll: sAdd, caption: "+ Add another", detail: "A new dentist to remember - add an entry.", focus: fzs(pad(lb.add, 40), P ? 1.4 : 1.6), ring: pad(lb.add, 3), click: mid(lb.add), duration: 5000 },
    { screen: "folderNew", url: U.folder, scroll: sNew, caption: "Entry 2", detail: "Business Name, Contact Name, Speciality / Role, Phone Number, Email Address - then Address and Mailing Address.", focus: fz(c2n.box, P ? 1 : 1.05), ring: pad(c2n.box, 2), duration: 6500 },
    { screen: "folderFilled", url: U.folder, scroll: sAddr, caption: "Fill in the details", detail: "Paddington Dental, Dr Ben Okafor, Dentist. Now the Address.", focus: fz(c2t.input("Address"), P ? 1.06 : 1.3), ring: pad(c2t.input("Address"), 3), click: mid(c2t.input("Address")), duration: 6000 },
    { screen: "folderTyping", url: U.folder, scroll: sAddr, caption: "Start typing an address…", detail: "Matching addresses drop down as you type - Australia and New Zealand. Pick the right one.", focus: fz(span(c2t.input("Address"), lt.sug!), P ? 1.06 : 1.25), ring: pad(span(c2t.input("Address"), lt.sug!), 3), click: { x: lt.sug!.x + 120, y: lt.sug!.y + 22 }, duration: 8000 },
    { screen: "folderPicked", url: U.folder, scroll: sAddr, caption: "Picked - so it can go on the map", detail: "The full address goes in, and the numbers under it are its spot on the map. Typed in without picking one, it's still saved - just not on the map.", focus: fz(c2p.rects.Address, P ? 1.06 : 1.35), ring: pad(c2p.rects.Address, 4), duration: 8500 },
    { screen: "folderPicked", url: U.folder, scroll: sSave, caption: "Save", detail: "Saved to Sarah's List of Medical Advisers - and onto the map.", focus: fzs(pad(c2p.save, 50), P ? 1.4 : 1.6), ring: pad(c2p.save, 3), click: mid(c2p.save), duration: 5000 },
    { screen: "maps8", url: U.maps, scroll: sMap, caption: "There it is - 8 locations", detail: "Back on Maps, the new pin in Paddington. Click it.", focus: P ? mapFocus : { ...pin(l8.map, fit8, NEW_LOC), scale: 1.3 }, ring: pinRing(l8.map, fit8, NEW_LOC), click: pin(l8.map, fit8, NEW_LOC), duration: 6000 },
    { screen: "pop8", url: U.maps, scroll: sMap, caption: "List of Medical Advisers · Address", detail: "The dentist, in Sarah's record. Add a school, a new job or a new house the same way.", focus: popFocus(pop8, NEW_LOC), ring: infoRect(pop8, NEW_LOC, l8.map), duration: 6500 },
    // Empty
    { screen: "empty", url: U.maps, caption: "Before any addresses are saved", detail: "The map waits until there's something to show - fill in addresses in your folders and they appear.", focus: fz(le.empty!, P ? 1.06 : 1.3), ring: pad(le.empty!, 3), duration: 6500 },
    // Round buttons
    { screen: "fabs", url: U.maps, caption: "Two round buttons", detail: "? opens help for this page. Tap the tour button any time to watch this again - you're watching it now.", focus: P ? { x: 270, y: 780, scale: 1.5 } : { x: 1050, y: 640, scale: 1.8 }, ring: { x: fab.right - 128, y: fab.y, w: 128, h: 56 }, click: { x: fab.right - 100, y: fab.y + 28 }, duration: 7000 },
  ]
  return { screens, steps }
}

const D = build(DV)
const PH = build(PV)

export default function MapsPageWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  const b = phone ? PH : D
  return (
    <WalkthroughPlayer music="/audio/pop-dance-music.mp3" key={dev} device={dev} steps={b.steps} screens={b.screens}
      title={phone ? "Maps (phone)" : "Maps (computer)"} url={U.maps} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "Maps", subtitle: "Every address in your family's records - home, schools, doctors, work - as pins on one map" }} />
  )
}
