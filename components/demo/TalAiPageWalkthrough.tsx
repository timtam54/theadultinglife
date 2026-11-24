"use client"

// "TAL AI" page walkthrough - the /tal-ai page's walkthrough (tour) button
// (components/demo/PageWalkthroughFab). Not the TAL AI part of "Your AI
// writing helpers" on /demo (AiHelpersWalkthrough.tsx) - that stays as it is.
// Hand-built copies of the real screens with a made-up family's sample data
// (the Taylors, Brisbane) - no sign-in, no API calls. Two versions
// (docs/Demo-Walkthroughs.md, rule 2):
//   computer - 1200 x 760, the sidebar + header layout (md and up)
//   phone    - 390 x 844, the mobile layout (header with logo, TAL AI, bell,
//              avatar, hamburger; single column)
// Covers every control on the page: the black header ("Ask anything ·
// Powered by ChatGPT"), where to open it from, the empty-chat intro and the
// four starter prompts (one is clicked), the question bubble and the
// "thinking" dots (box greyed out, Send shows …), the streamed answer, the
// "From the guide" chips (hover title, click one -> the folder it opens, a
// nav "Where is…?" chip that isn't a link), the disclaimer under each answer,
// Report (thumbs down -> "Reported — thanks for the feedback"), a typed
// follow-up (Enter / Shift+Enter), the advice boundary ("Which super fund
// should I choose?" -> what to compare + a licensed financial adviser), the
// footer disclaimer, and that the chat isn't saved.
// The page has no voice / dictate button, no thumbs up, no clear-chat button
// and no first-use AI consent box, so none are drawn.
// Copies: app/(app)/tal-ai/page.tsx (header), components/TalAiChat
// (STARTER_PROMPTS, CHAT_INTRO, bubbles, citation chips + title, Report,
// textarea "Ask something…", Send), components/AiDisclaimer (inline text),
// app/api/tal-ai/chat/route.ts (SYSTEM_PROMPT + HIGH_RISK_TOPICS - the
// answers follow its rules), app/api/tal-ai/feedback/route.ts,
// lib/help/route-to-slug.ts (which chips link where), the Superannuation
// Funds and Annual Taxation Report questions in supabase/migrations (025, 144,
// 148, 175, 205), app/(app)/dashboard (Need a hand? card), app/(app)/layout.tsx
// header, AppSidebar, HelpButton, TourFab. The shell, folder page and round
// buttons are copied from RemindersPageWalkthrough.
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

// ── Icons (copied from nav-items.tsx, layout.tsx and the pages) ─────────────

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
const NAV_TALAI = 7
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
// TalAiChat's ThumbsDownIcon
const ThumbsDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M7 14V4h10l3 6v4h-5l1 5a2 2 0 0 1-2 2l-4-8H7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" transform="rotate(180 12 12)" />
  </svg>
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
const Shell = ({ v, h, nav = NAV_TALAI, children }: { v: V; h: number; nav?: number; children: ReactNode }) =>
  v.phone ? <PShell h={h}>{children}</PShell> : <DShell h={h} nav={nav}>{children}</DShell>

// ── The chat (TalAiChat) ─────────────────────────────────────────────────────

const STARTER_PROMPTS = [
  "Help me write an email to my landlord",
  "What information belongs in an emergency contact record?",
  "Explain how the Australian financial year works",
  "How should I organise my tax paperwork?",
]
const CHAT_INTRO = "TAL AI gives general guidance and wording help — not legal, financial, tax or medical advice."
const DISCLAIMER = "Standard terms apply. AI answers are a guide only, not personal advice. Always check important decisions with the right professional."

interface Cite { title: string; link: boolean; tip: string }
interface Msg { role: "user" | "assistant"; text: string; cites?: Cite[]; reported?: boolean; thinking?: boolean }

// Sample conversation. The answers follow the chat route's SYSTEM_PROMPT:
// guide first and cite it, warm Australian tone, short with bullet steps, no
// invented forms or dollar figures, official sources for ATO rules, and for
// personalised questions (HIGH_RISK_TOPICS) general guidance + a professional.
const Q1 = STARTER_PROMPTS[3]
const A1 = `Great question — a simple system now saves a scramble come July.

From the guide's Annual Taxation Report section:
• Keep one set of paperwork per financial year (1 July – 30 June).
• Snap receipts as you go, so they don't fade in a drawer.
• Keep each year's return and notice of assessment together.
• Note whether you lodge yourself or use an accountant.

The ATO's record-keeping rules can change, so check ato.gov.au for what to keep. You've got this!`
const A1_PART = `Great question — a simple system now saves a scramble come July.

From the guide's Annual Taxation Report section:
• Keep one set of paperwork per financial`
const C1: Cite[] = [
  { title: "Annual Taxation Report", link: true, tip: "Organiser page 46 · 84% match" },
  { title: "Receipts", link: true, tip: "71% match" },
  { title: "Where is Receipts?", link: false, tip: "58% match" },
]
const Q2 = "Do I still need to keep records if an accountant does my return?"
const A2 = `Yes — your accountant prepares the return, but the records are still yours to keep.

• Keep receipts and statements in your Organiser as you go.
• Save your accountant's details in Custom — List of Accountants, so your family knows who to call.
• Ask them each year what they'd like from you.

For what applies to your own return, your accountant is the one to confirm.`
const C2: Cite[] = [
  { title: "Custom — List of Accountants", link: true, tip: "Organiser page 52 · 79% match" },
  { title: "Annual Taxation Report", link: true, tip: "Organiser page 46 · 66% match" },
]
const Q3 = "Which super fund should I choose?"
const A3 = `I can't pick a fund for you — the right one depends on your situation — but here's what's worth comparing:

• Fees, and how they add up over time
• Long-term returns after fees
• Insurance inside the fund (death, TPD, income protection)
• Whether it's a MySuper product

The ATO's YourSuper comparison tool on ato.gov.au compares MySuper products. For a recommendation for your situation, a licensed financial adviser can compare specific funds for you.`
const C3: Cite[] = [
  { title: "Superannuation Funds", link: true, tip: "Organiser page 49 · 81% match" },
  { title: "Superannuation Statements", link: true, tip: "Organiser page 49 · 72% match" },
]

const CONV1: Msg[] = [{ role: "user", text: Q1 }]
const M_THINK1: Msg[] = [...CONV1, { role: "assistant", text: "", thinking: true }]
const M_STREAM1: Msg[] = [...CONV1, { role: "assistant", text: A1_PART, cites: C1 }]
const M_A1: Msg[] = [...CONV1, { role: "assistant", text: A1, cites: C1 }]
const M_A1R: Msg[] = [...CONV1, { role: "assistant", text: A1, cites: C1, reported: true }]
const M_A2: Msg[] = [...M_A1R, { role: "user", text: Q2 }, { role: "assistant", text: A2, cites: C2 }]
const M_THINK3: Msg[] = [...M_A2, { role: "user", text: Q3 }, { role: "assistant", text: "", thinking: true }]
const M_A3: Msg[] = [...M_A2, { role: "user", text: Q3 }, { role: "assistant", text: A3, cites: C3 }]

const CW = 7.3 // ~px per character, text-sm
const LH = 20 // line height in the bubbles (leading-5)
function chatLayout(v: V) {
  const hdr = { x: v.x, y: v.top, w: v.phone ? v.w : 768, h: v.phone ? 94 : 64 }
  const box = { x: v.x, y: hdr.y + hdr.h + 24, w: hdr.w, h: v.phone ? 590 : 532 }
  const footH = v.phone ? 64 : 48
  const foot = { x: box.x, y: box.y + box.h - footH, w: box.w, h: footH }
  const send = { x: box.x + box.w - 12 - 68, y: foot.y - 12 - 40, w: 68, h: 40 }
  const input = { x: box.x + 12, y: send.y, w: send.x - 8 - box.x - 12, h: 40 }
  const area = { x: box.x, y: box.y, w: box.w, h: foot.y - 64 - box.y }
  // Empty state: intro + starter prompts, centred in the message area.
  const introW = Math.min(448, box.w - 40)
  const introLines = wrapLines(`${CHAT_INTRO} Always check important decisions with the right professional.`, introW, 6.6)
  const introH = 24 + introLines * 20
  const maxRow = Math.min(512, box.w - 40)
  const chipW = (t: string) => Math.min(maxRow, Math.round(t.length * 6.4 + 24))
  const rows: { t: string; w: number }[][] = [[]]
  let rw = 0
  for (const t of STARTER_PROMPTS) {
    const w = chipW(t)
    if (rows[rows.length - 1].length && rw + 8 + w > maxRow) { rows.push([]); rw = 0 }
    rows[rows.length - 1].push({ t, w }); rw += (rw ? 8 : 0) + w
  }
  const startersH = rows.length * 30 + (rows.length - 1) * 8
  const emptyH = introH + 16 + startersH
  const introY = area.y + 24 + Math.max(0, (area.h - 48 - emptyH) / 2)
  const intro = { x: box.x + (box.w - introW) / 2, y: introY, w: introW, h: introH }
  const starters: { t: string; r: Rect }[] = []
  rows.forEach((row, ri) => {
    const tw = row.reduce((s, c) => s + c.w, 0) + (row.length - 1) * 8
    let x = box.x + (box.w - tw) / 2
    for (const c of row) { starters.push({ t: c.t, r: { x, y: introY + introH + 16 + ri * 38, w: c.w, h: 30 } }); x += c.w + 8 }
  })
  return { hdr, box, foot, send, input, area, intro, starters, startersAll: span(starters[0].r, starters[starters.length - 1].r) }
}

interface PlacedMsg { m: Msg; bubble: Rect; chips: { c: Cite; r: Rect }[]; label?: Rect; disc?: Rect; report?: Rect; lastPara: number }
/** Places the messages; `scroll` is "bottom" (where the real chat sits) or the index of a message to bring to the top. */
function placeMsgs(v: V, msgs: Msg[], scroll: "bottom" | number = "bottom") {
  const L = chatLayout(v)
  const { area } = L
  const inner = area.w - 40
  const maxW = Math.floor(inner * 0.8)
  const textW = maxW - 32
  const out: PlacedMsg[] = []
  let y = 24
  for (const m of msgs) {
    let bubble: Rect, lastPara = 0
    if (m.role === "user") {
      const lines = wrapLines(m.text, textW, CW)
      const w = lines > 1 ? maxW : Math.min(maxW, Math.round(m.text.length * CW + 34))
      bubble = { x: area.x + 20 + inner - w, y, w, h: 24 + lines * LH }
    } else if (m.thinking) {
      bubble = { x: area.x + 20, y, w: 64, h: 44 }
    } else {
      const paras = m.text.split("\n")
      const lines = paras.reduce((s, p) => s + (p ? wrapLines(p, textW, CW) : 1), 0)
      lastPara = wrapLines(paras[paras.length - 1], textW, CW)
      bubble = { x: area.x + 20, y, w: maxW, h: 24 + lines * LH }
    }
    let bottom = bubble.y + bubble.h
    const pm: PlacedMsg = { m, bubble, chips: [], lastPara }
    if (m.role === "assistant" && !m.thinking) {
      if (m.cites?.length) {
        // "From the guide:" then the chips, wrapping (flex-wrap gap-1.5)
        let cx = bubble.x + 4, cy = bottom + 4
        pm.label = { x: cx, y: cy, w: 86, h: 20 }
        cx += 86 + 6
        for (const c of m.cites) {
          const w = Math.round(c.title.length * 6 + 18)
          if (cx + w > bubble.x + maxW) { cx = bubble.x + 4; cy += 26 }
          pm.chips.push({ c, r: { x: cx, y: cy, w, h: 20 } })
          cx += w + 6
        }
        bottom = cy + 20
      }
      const dl = wrapLines(DISCLAIMER, maxW - 4, 5.5)
      pm.disc = { x: bubble.x + 4, y: bottom + 4, w: maxW - 4, h: dl * 16 }
      pm.report = { x: bubble.x + 4, y: pm.disc.y + pm.disc.h + 4, w: m.reported ? 190 : 62, h: 16 }
      bottom = pm.report.y + pm.report.h
    }
    out.push(pm)
    y = bottom + 16
  }
  const contentH = y - 16 + 24
  const max = Math.max(0, contentH - area.h)
  const off = scroll === "bottom" ? max : Math.max(0, Math.min(max, out[scroll].bubble.y - 16))
  // Move everything into screen coordinates.
  const sh = (r: Rect) => ({ ...r, y: area.y + r.y - off })
  for (const p of out) {
    p.bubble = sh(p.bubble)
    p.chips = p.chips.map((c) => ({ c: c.c, r: sh(c.r) }))
    if (p.label) p.label = sh(p.label)
    if (p.disc) p.disc = sh(p.disc)
    if (p.report) p.report = sh(p.report)
  }
  return out
}
/** The part of `r` inside the message area (a bubble taller than the area). */
const clipTo = (r: Rect, a: Rect): Rect => { const y0 = Math.max(r.y, a.y + 2), y1 = Math.min(r.y + r.h, a.y + a.h - 2); return { x: r.x, y: y0, w: r.w, h: Math.max(0, y1 - y0) } }

function Dots() {
  return (
    <span className="inline-flex items-center gap-1 text-tal-plum-soft">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tal-plum-soft" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tal-plum-soft" style={{ animationDelay: "150ms" }} />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tal-plum-soft" style={{ animationDelay: "300ms" }} />
    </span>
  )
}

interface ChatProps {
  v: V
  msgs?: Msg[]
  scroll?: "bottom" | number
  typing?: string
  typed?: string
  busy?: boolean
  tip?: string
  fabs?: boolean
}
function TalAiPage({ v, msgs = [], scroll = "bottom", typing, typed, busy, tip, fabs }: ChatProps) {
  const L = chatLayout(v)
  const { hdr, box, area, foot } = L
  const placed = placeMsgs(v, msgs, scroll)
  const tipChip = tip ? placed.flatMap((p) => p.chips).find((c) => c.c.title === tip) : undefined
  const sendOff = busy || !(typing || typed)
  return (
    <Shell v={v} h={v.H}>
      {/* Header (tal-ai/page.tsx) */}
      <Box {...hdr} className="rounded-2xl bg-black px-6 py-4 text-white shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">TAL AI</span>
          <span className="font-display text-2xl leading-tight">Ask anything</span>
          <span className="mx-1 text-white/40">·</span>
          <span className="text-sm text-white/80">Powered by ChatGPT</span>
        </div>
      </Box>
      <Box {...box} className="overflow-hidden rounded-2xl border border-tal-line bg-white" />
      {/* Messages, clipped to the scroll area */}
      <Box {...area} className="overflow-hidden">
        <div className="absolute" style={{ left: -area.x, top: -area.y, width: v.W, height: v.H }}>
          {msgs.length === 0 && (
            <>
              <Box {...L.intro} className="text-center">
                <p className="mb-1 font-medium text-tal-plum">Ask TAL AI for a hand with life admin.</p>
                <p className="text-sm text-tal-plum-soft">{CHAT_INTRO} Always check important decisions with the right professional.</p>
              </Box>
              {L.starters.map((s) => (
                <Box key={s.t} {...s.r} className="flex items-center rounded-full border border-tal-line bg-tal-cream-soft/60 px-3 text-left text-xs leading-tight text-tal-plum">{s.t}</Box>
              ))}
            </>
          )}
          {placed.map((p, i) => (
            <div key={i}>
              <Box {...p.bubble} className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-5 ${p.m.role === "user" ? "bg-black text-white" : "bg-tal-cream-soft text-tal-plum"}`}>
                {p.m.thinking ? <Dots /> : p.m.text}
              </Box>
              {p.label && <Box {...p.label} className="flex items-center text-[11px] text-tal-plum-soft">From the guide:</Box>}
              {p.chips.map(({ c, r }) => (
                <Box key={c.title} {...r} className="flex items-center justify-center whitespace-nowrap rounded-full border border-tal-line bg-white text-[11px] text-tal-plum">{c.title}</Box>
              ))}
              {p.disc && <Box {...p.disc} className="text-[11px] italic leading-4 text-tal-plum-soft">{DISCLAIMER}</Box>}
              {p.report && (p.m.reported
                ? <Box {...p.report} className="flex items-center text-[11px] italic text-tal-plum-soft">Reported — thanks for the feedback</Box>
                : <Box {...p.report} className="flex items-center gap-1 text-[11px] text-tal-plum-soft"><ThumbsDownIcon />Report</Box>)}
            </div>
          ))}
        </div>
      </Box>
      {/* Input row */}
      <Box x={box.x} y={foot.y - 64} w={box.w} h={1} className="bg-tal-line" />
      <Box {...L.input} className={`flex items-center rounded-xl border bg-white px-3 text-sm ${typing || typed ? "border-tal-plum" : "border-tal-line"} ${busy ? "opacity-60" : ""}`}>
        <span className="truncate">{typing ? <Typed text={typing} /> : typed ? typed : <span className="text-gray-400">Ask something…</span>}</span>
      </Box>
      <Box {...L.send} className={`flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white ${sendOff ? "opacity-60" : ""}`}>{busy ? "…" : "Send"}</Box>
      {/* Footer disclaimer */}
      <Box {...foot} className="border-t border-tal-line px-5 py-2">
        <p className="text-[11px] italic leading-4 text-tal-plum-soft">{DISCLAIMER}</p>
      </Box>
      {/* The chip's hover title */}
      {tipChip && (
        <Box x={tipChip.r.x + 20} y={tipChip.r.y + 26} w={196} h={24} className="flex items-center rounded border border-gray-300 bg-white px-2 text-[11px] text-gray-800 shadow-md">{tipChip.c.tip}</Box>
      )}
      {fabs && <Fabs {...FAB(v)} />}
    </Shell>
  )
}

// ── A folder page (records/[category]/[subcategory] + PageForm, simplified) ──

interface FF { l: string; v?: string; req?: boolean; hint?: string; full?: boolean; file?: boolean }
interface FolderSpec { cat: string; name: string; thumb: string; person?: string; entry?: string; fields: FF[] }
const TS = "/thumbnails/subcategories/"
// Annual Taxation Report (migration 148)
const F_TAX: FolderSpec = {
  cat: "Admin & Bookkeeping", name: "Annual Taxation Report", thumb: `${TS}admin.annual_tax_report.png`, person: "Sarah Taylor", entry: "Entry 1",
  fields: [
    { l: "Tax document", v: "Notice of assessment 2025-26.pdf", file: true, full: true, hint: "Upload the notice of assessment, return, or supporting document" },
    { l: "Title", v: "Notice of Assessment 2025-26", full: true, hint: "e.g. Tax Return 2025-26, Notice of Assessment 2025-26" },
    { l: "Financial year", v: "2025-26", hint: "e.g. 2025-26" },
    { l: "Date", v: "14/08/2026", hint: "Assessment / lodgement date" },
    { l: "Refund amount ($)", v: "1,284.00", hint: "Leave blank if you owed money instead" },
    { l: "Amount paid / payable ($)", hint: "Leave blank if you received a refund instead" },
    { l: "Archived on", full: true, hint: "Leave blank to keep this in Current returns. A past date moves this to \"Past returns\"." },
    { l: "Notes", v: "Lodged by Riverbend Tax & Accounting.", full: true },
  ],
}
// Superannuation Funds (migrations 025, 144, 175, 205)
const F_SUPER: FolderSpec = {
  cat: "Admin & Bookkeeping", name: "Superannuation Funds", thumb: `${TS}admin.super_statements.png`, person: "Sarah Taylor", entry: "Entry 1",
  fields: [
    { l: "Statement document", v: "Kookaburra Super annual statement.pdf", file: true, full: true, hint: "Upload a scan or photo (PDF or image). We can read it for you." },
    { l: "Fund Name", v: "Kookaburra Super", full: true },
    { l: "Member Number", v: "KS-448 120" },
    { l: "Approx. Balance", v: "86,400" },
    { l: "Beneficiary", v: "James Taylor", full: true },
    { l: "Fund Contact", v: "Member services · 1300 000 000", full: true },
    { l: "Insurance in Superannuation", v: "Death and TPD cover", full: true, hint: "Death / TPD / income protection" },
    { l: "Notes", full: true },
    { l: "End date", hint: "Blank if still contributing. A past date moves this to \"Past funds\"." },
  ],
}
interface FPlaced { f: FF; r: Rect }
function folderLayout(v: V, sp: FolderSpec) {
  const picker = v.phone ? { x: v.x, y: v.top + 28, w: 200, h: 40 } : { x: v.x + 390, y: v.top - 2, w: 200, h: 40 }
  const head = { x: v.x, y: v.phone ? v.top + 80 : v.top + 52, w: v.w, h: v.phone ? 120 : 72 }
  const card = { x: v.x, y: head.y + head.h + 20, w: v.w, h: 0 }
  const items: FPlaced[] = []
  const inner = v.w - 32, colW = v.phone ? inner : (inner - 16) / 2
  let y = card.y + 16 + 36 + 12, col = 0, rowMax = 0
  const fh = (f: FF, w: number) => 18 + 4 + 40 + (f.hint ? 4 + wrapLines(f.hint, w, 6.2) * 16 : 0)
  for (const f of sp.fields) {
    const full = v.phone || f.full
    if (full && col === 1) { y += rowMax + 16; col = 0; rowMax = 0 }
    const w = full ? inner : colW
    const h = fh(f, w)
    items.push({ f, r: { x: v.x + 16 + (col === 1 ? colW + 16 : 0), y, w, h } })
    rowMax = Math.max(rowMax, h)
    if (full || col === 1) { y += rowMax + 16; col = 0; rowMax = 0 } else col = 1
  }
  if (col === 1) y += rowMax + 16
  card.h = y - card.y
  const save = { x: v.x, y: card.y + card.h + 16, w: 96, h: 40 }
  return { picker, head, card, items, save, h: Math.max(v.H, save.y + 100) }
}
const fieldOf = (lay: ReturnType<typeof folderLayout>, l: string) => lay.items.find((p) => p.f.l === l)!.r

function FolderPage({ v, sp, hl }: { v: V; sp: FolderSpec; hl?: string[] }) {
  const lay = folderLayout(v, sp)
  const { head, picker } = lay
  return (
    <Shell v={v} h={lay.h} nav={NAV_ORGANISER}>
      <Box x={v.x} y={v.top} w={v.phone ? v.w : 380} h={22} className="flex items-center gap-2 whitespace-nowrap text-sm text-tal-plum-soft"><span>The Adulting Life Organiser</span><span className="opacity-50">·</span><span>{sp.cat}</span><span className="opacity-50">·</span></Box>
      {sp.person && (
        <>
          <Box {...picker} className="flex items-center gap-2 rounded-full border-2 border-tal-plum/40 bg-white pl-2 pr-3 text-sm font-semibold shadow-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tal-plum/10 text-xs">👤</span><span className="flex-1 truncate">{sp.person}</span><span className="text-xs">▾</span>
          </Box>
          <Box x={picker.x + picker.w + 10} y={picker.y + 11} w={150} h={18} className="text-xs italic text-tal-plum-soft">click to switch person</Box>
        </>
      )}
      <Box {...head} className="rounded-2xl bg-black shadow-md" />
      <Img src={sp.thumb} x={head.x + (v.phone ? 12 : 20)} y={head.y + 12} w={48} className="rounded-xl bg-white ring-2 ring-white/20" />
      <Box x={head.x + (v.phone ? 76 : 84)} y={head.y + 12} w={v.phone ? v.w - 88 : 560} h={48} className="flex items-center font-display text-white" style={{ fontSize: v.phone ? 20 : 24 }}>{sp.name}</Box>
      <Box x={v.phone ? head.x + 12 : head.x + head.w - 140} y={v.phone ? head.y + 72 : head.y + 18} w={120} h={36} className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 text-sm font-medium text-white">▦ Excel</Box>
      <Box {...lay.card} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={lay.card.x + 16} y={lay.card.y + 16} w={lay.card.w - 32} h={36} className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-tal-plum-soft">{sp.entry ?? ""}</span>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-tal-line bg-white text-red-700">🗑</span>
      </Box>
      {lay.items.map(({ f, r }) => (
        <Box key={f.l} {...r}>
          <p className="mb-1 text-xs uppercase leading-[18px] tracking-wider text-tal-plum-soft">{f.l}{f.req && <span className="text-red-500">*</span>}</p>
          <div className={`flex h-10 items-center rounded-xl border bg-white px-3 text-sm ${hl?.includes(f.l) ? "border-amber-400 ring-2 ring-amber-200" : "border-tal-line"}`}>
            {f.file ? <span className="flex min-w-0 items-center gap-2"><span className="rounded-md bg-tal-cream-soft px-1.5 py-0.5 text-xs">📎</span><span className="truncate">{f.v}</span></span> : <span className="truncate">{f.v ?? ""}</span>}
          </div>
          {f.hint && <p className="mt-1 text-xs leading-4 text-tal-plum-soft">{f.hint}</p>}
        </Box>
      ))}
      <Box {...lay.save} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>
    </Shell>
  )
}

// ── Screens and steps (shared by both versions) ──────────────────────────────

const LAST1 = 1 // index of the first answer
const LAST2 = 3
const LAST3 = 5

function buildScreens(v: V): Record<string, ReactNode> {
  return {
    empty: <TalAiPage v={v} />,
    think1: <TalAiPage v={v} msgs={M_THINK1} busy />,
    stream1: <TalAiPage v={v} msgs={M_STREAM1} busy />,
    a1Top: <TalAiPage v={v} msgs={M_A1} scroll={0} />,
    a1: <TalAiPage v={v} msgs={M_A1} />,
    a1Tip: <TalAiPage v={v} msgs={M_A1} tip="Annual Taxation Report" />,
    a1Rep: <TalAiPage v={v} msgs={M_A1R} />,
    a1Typing: <TalAiPage v={v} msgs={M_A1R} typing={Q2} />,
    a1Typed: <TalAiPage v={v} msgs={M_A1R} typed={Q2} />,
    a2Top: <TalAiPage v={v} msgs={M_A2} scroll={LAST2 - 1} />,
    a2: <TalAiPage v={v} msgs={M_A2} />,
    a2Typing: <TalAiPage v={v} msgs={M_A2} typing={Q3} />,
    a2Typed: <TalAiPage v={v} msgs={M_A2} typed={Q3} />,
    think3: <TalAiPage v={v} msgs={M_THINK3} busy />,
    a3Top: <TalAiPage v={v} msgs={M_A3} scroll={LAST3 - 1} />,
    a3: <TalAiPage v={v} msgs={M_A3} />,
    tax: <FolderPage v={v} sp={F_TAX} />,
    super: <FolderPage v={v} sp={F_SUPER} />,
    fresh: <TalAiPage v={v} />,
    fabs: <TalAiPage v={v} msgs={M_A3} fabs />,
  }
}

const BASE = "app.theadultinglife.com.au"
const U = {
  talai: `${BASE}/tal-ai`,
  tax: `${BASE}/records/admin/admin.annual_tax_report`,
  super: `${BASE}/records/admin/admin.super_statements`,
}

function buildSteps(v: V): WalkStep[] {
  const P = v.phone
  const sc = (h: number, y: number) => Math.max(0, Math.min(h - v.H, Math.round(y - v.H * 0.4)))
  // Zoom on a rect - centred and kept modest on a phone so full-width boxes aren't clipped.
  const fz = (r: Rect, s: number) => ({ x: P ? 195 : r.x + r.w / 2, y: r.y + r.h / 2, scale: P ? Math.min(s, 1.06) : s })
  // Zoom on a small target (a button) - fine at a higher scale on both.
  const fzs = (r: Rect, s: number) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, scale: s })

  const L = chatLayout(v)
  const { area } = L
  const starter = L.starters[3].r
  const pThink1 = placeMsgs(v, M_THINK1)
  const pStream1 = placeMsgs(v, M_STREAM1)
  const pA1Top = placeMsgs(v, M_A1, 0)[LAST1]
  const pA1 = placeMsgs(v, M_A1)[LAST1]
  const pA1R = placeMsgs(v, M_A1R)[LAST1]
  const pA2Top = placeMsgs(v, M_A2, LAST2 - 1)
  const pA2 = placeMsgs(v, M_A2)[LAST2]
  const pThink3 = placeMsgs(v, M_THINK3)
  const pA3Top = placeMsgs(v, M_A3, LAST3 - 1)
  const pA3 = placeMsgs(v, M_A3)[LAST3]
  const chipOf = (p: PlacedMsg, t: string) => p.chips.find((c) => c.c.title === t)!.r
  const chipsRow = (p: PlacedMsg) => span(p.label!, p.chips[p.chips.length - 1].r)
  const taxChip = chipOf(pA1, "Annual Taxation Report")
  const superChip = chipOf(pA3, "Superannuation Funds")
  const navChip = chipOf(pA1, "Where is Receipts?")
  const ft = folderLayout(v, F_TAX), fs = folderLayout(v, F_SUPER)
  const fab = FAB(v)
  // The last paragraph of the super answer: the "licensed financial adviser" line.
  const advice = { x: pA3.bubble.x, y: pA3.bubble.y + pA3.bubble.h - 12 - pA3.lastPara * LH - 2, w: pA3.bubble.w, h: pA3.lastPara * LH + 6 }
  const a3Top = clipTo(pA3Top[LAST3].bubble, area)
  const q3Top = pA3Top[LAST3 - 1].bubble

  return [
    // The page
    { screen: "empty", url: U.talai, caption: "TAL AI: ask anything", detail: "TAL stands for The Adulting Life. It's your built-in guide for life admin - tax, super, insurance, passports, work, health records and more. Powered by ChatGPT.", focus: fz(L.hdr, P ? 1.06 : 1.5), ring: L.hdr, duration: 7500 },
    { screen: "empty", url: U.talai, caption: "Open it from any page", detail: P ? "The black TAL AI button at the top of every page, TAL AI in the ☰ menu, or Ask a question on the dashboard's \"Need a hand?\" card." : "Ask TAL AI at the top of every page, TAL AI in the sidebar, or Ask a question on the dashboard's \"Need a hand?\" card.", focus: P ? { x: 230, y: 120, scale: 1.6 } : { x: 760, y: 200, scale: 1.25 }, ring: P ? pad(P_ASK, 4) : pad(ASK, 4), duration: 7000 },
    { screen: "empty", url: U.talai, caption: "Guidance, not advice", detail: "\"TAL AI gives general guidance and wording help — not legal, financial, tax or medical advice. Always check important decisions with the right professional.\"", focus: fz(L.intro, 1.5), ring: pad(L.intro, 6), duration: 8000 },
    { screen: "empty", url: U.talai, caption: "Not sure what to ask? Start here", detail: "Four starter questions: an email to your landlord, what goes in an emergency contact record, how the Australian financial year works, and organising your tax paperwork.", focus: fz(L.startersAll, P ? 1.06 : 1.5), ring: pad(L.startersAll, 6), duration: 8000 },
    { screen: "empty", url: U.talai, caption: "Tap one and it's asked straight away", detail: "Sarah taps \"How should I organise my tax paperwork?\"", focus: fzs(starter, P ? 1.5 : 1.7), ring: pad(starter, 3), click: mid(starter), duration: 5500 },
    // Answer 1
    { screen: "think1", url: U.talai, caption: "TAL AI is thinking", detail: "Your question shows on the right. While it works, the box is greyed out and Send shows \"…\".", focus: fz(span(pThink1[0].bubble, L.send), P ? 1.06 : 1.15), ring: pad(span(pThink1[0].bubble, pThink1[1].bubble), 6), duration: 6000 },
    { screen: "stream1", url: U.talai, caption: "The answer writes itself in", detail: "It checks The Adulting Life guide (from Donna Fitzgerald's Adulting Life Organiser) first, then answers in plain English, word by word.", focus: fz(pStream1[1].bubble, P ? 1.06 : 1.4), ring: pad(pStream1[1].bubble, 3), duration: 6500 },
    { screen: "a1Top", url: U.talai, caption: "Short, practical steps", detail: "It says which guide section it used. Rules that change - like the ATO's - come with the official site to check. It never makes up forms or dollar figures.", focus: fz(clipTo(pA1Top.bubble, area), P ? 1.06 : 1.3), ring: pad(clipTo(pA1Top.bubble, area), 3), duration: 9000 },
    // Chips
    { screen: "a1", url: U.talai, caption: "From the guide", detail: "The guide sections behind the answer. Most open the folder or page in the app; a \"Where is…?\" chip is just a tip for finding a page, not a link.", focus: fz(chipsRow(pA1), P ? 1.06 : 1.8), ring: pad(chipsRow(pA1), 4), duration: 8000 },
    { screen: "a1Tip", url: U.talai, caption: "Hover a chip for the page and match", detail: "Which page of the Organiser it came from, and how closely it matched your question.", focus: fzs(taxChip, P ? 1.6 : 2), ring: pad(taxChip, 3), duration: 6000 },
    { screen: "a1", url: U.talai, caption: "Click a chip", detail: "Annual Taxation Report.", focus: fzs(taxChip, P ? 1.6 : 2), ring: pad(taxChip, 3), click: mid(taxChip), duration: 4500 },
    { screen: "tax", url: U.tax, scroll: P ? sc(ft.h, fieldOf(ft, "Refund amount ($)").y) : 0, caption: "Straight to that folder", detail: "Annual Taxation Report: upload the notice of assessment or return, then the title, financial year, date, and refund or amount payable. A past Archived on date moves it to Past returns.", focus: P ? undefined : { x: 720, y: 420, scale: 1.05 }, ring: pad(span(fieldOf(ft, "Tax document"), fieldOf(ft, "Amount paid / payable ($)")), 4), duration: 9000 },
    { screen: "a1", url: U.talai, caption: "\"Where is Receipts?\" isn't a link", detail: "It helped TAL AI tell you where things are. Receipts is in the sidebar.", focus: fzs(navChip, P ? 1.6 : 2), ring: pad(navChip, 3), duration: 5500 },
    // Disclaimer + Report
    { screen: "a1", url: U.talai, caption: "Under every answer", detail: "\"Standard terms apply. AI answers are a guide only, not personal advice. Always check important decisions with the right professional.\"", focus: fz(pA1.disc!, P ? 1.06 : 1.8), ring: pad(pA1.disc!, 3), duration: 7000 },
    { screen: "a1", url: U.talai, caption: "Report", detail: "Wrong, unhelpful or unsafe? Report sends the answer to The Adulting Life team so they can check it.", focus: fzs(pA1.report!, P ? 1.7 : 2.2), ring: pad(pA1.report!, 4), click: mid(pA1.report!), duration: 6000 },
    { screen: "a1Rep", url: U.talai, caption: "Reported — thanks for the feedback", detail: "Once is enough - it can't be reported twice.", focus: fzs(pA1R.report!, P ? 1.7 : 2), ring: pad(pA1R.report!, 4), duration: 5500 },
    // Follow-up
    { screen: "a1Typing", url: U.talai, caption: "Ask a follow-up", detail: "Type in \"Ask something…\". Enter sends; Shift+Enter starts a new line.", focus: fz(span(L.input, L.send), P ? 1.06 : 1.4), ring: pad(L.input, 3), duration: 7500 },
    { screen: "a1Typed", url: U.talai, caption: "Send", focus: fzs(L.send, P ? 1.6 : 1.8), ring: pad(L.send, 3), click: mid(L.send), duration: 4000 },
    { screen: "a2Top", url: U.talai, caption: "It remembers the conversation", detail: "It knows \"my return\" means the tax paperwork you just asked about - and for your own return, it points you back to your accountant.", focus: fz(clipTo(span(pA2Top[LAST2 - 1].bubble, pA2Top[LAST2].bubble), area), P ? 1.06 : 1.2), ring: pad(clipTo(pA2Top[LAST2].bubble, area), 3), duration: 8500 },
    { screen: "a2", url: U.talai, caption: "Custom — List of Accountants", detail: "That chip opens the folder for your accountant's details, so your family knows who to call.", focus: fz(chipsRow(pA2), P ? 1.06 : 1.8), ring: pad(chipOf(pA2, "Custom — List of Accountants"), 3), duration: 6500 },
    // Advice boundary
    { screen: "a2Typing", url: U.talai, caption: "A personal question", detail: "\"Which super fund should I choose?\"", focus: fz(span(L.input, L.send), P ? 1.06 : 1.4), ring: pad(L.input, 3), duration: 5500 },
    { screen: "a2Typed", url: U.talai, caption: "Send", focus: fzs(L.send, P ? 1.6 : 1.8), ring: pad(L.send, 3), click: mid(L.send), duration: 3500 },
    { screen: "think3", url: U.talai, caption: "Thinking…", focus: fz(span(pThink3[LAST3 - 1].bubble, pThink3[LAST3].bubble), P ? 1.06 : 1.3), ring: pad(span(pThink3[LAST3 - 1].bubble, pThink3[LAST3].bubble), 6), duration: 4000 },
    { screen: "a3Top", url: U.talai, caption: "What to compare - not a pick", detail: "TAL AI won't choose a fund for you. It explains what to look at: fees, returns after fees, insurance inside the fund, and whether it's a MySuper product.", focus: fz(span(q3Top, a3Top), P ? 1.06 : 1.2), ring: pad(a3Top, 3), duration: 9000 },
    { screen: "a3", url: U.talai, caption: "…then the right professional", detail: "Personal calls go to the right person: a licensed financial adviser for super and insurance, an accountant or tax agent for deductions, your GP for health, a solicitor before you sign a contract, Services Australia for Centrelink.", focus: fz(advice, P ? 1.06 : 1.6), ring: pad(advice, 3), duration: 10000 },
    { screen: "a3", url: U.talai, caption: "Superannuation Funds", detail: "Keep every fund you have in one place.", focus: fzs(superChip, P ? 1.6 : 2), ring: pad(superChip, 3), click: mid(superChip), duration: 5000 },
    { screen: "super", url: U.super, scroll: P ? sc(fs.h, fieldOf(fs, "Beneficiary").y) : 0, caption: "One entry per fund", detail: "Statement (AI can read it), fund name, member number, approximate balance, beneficiary, fund contact and the insurance inside it. Add an End date when you leave a fund and it moves to Past funds.", focus: P ? undefined : { x: 720, y: 440, scale: 1.05 }, ring: pad(span(fieldOf(fs, "Fund Name"), fieldOf(fs, "Insurance in Superannuation")), 4), duration: 9500 },
    // Footer + privacy + fresh start
    { screen: "a3", url: U.talai, caption: "Always at the bottom", detail: "The same reminder sits under the box. Your questions go to OpenAI (ChatGPT) to write the answer - TAL AI doesn't look inside your folders.", focus: fz(L.foot, P ? 1.06 : 1.6), ring: L.foot, duration: 8000 },
    { screen: "fresh", url: U.talai, caption: "The chat isn't saved", detail: "Leave the page or refresh and the next visit starts fresh, with the starter questions again.", focus: fz(span(L.intro, L.startersAll), P ? 1.06 : 1.3), ring: pad(span(L.intro, L.startersAll), 6), duration: 6500 },
    // Round buttons
    { screen: "fabs", url: U.talai, caption: "Two round buttons", detail: "? opens help for this page. Tap the tour button any time to watch this again — you're watching it now.", focus: P ? { x: 270, y: 780, scale: 1.5 } : { x: 1050, y: 640, scale: 1.8 }, ring: { x: fab.right - 128, y: fab.y, w: 128, h: 56 }, click: { x: fab.right - 100, y: fab.y + 28 }, duration: 7000 },
  ]
}

const D_SCREENS = buildScreens(DV)
const P_SCREENS = buildScreens(PV)
const D_STEPS = buildSteps(DV)
const P_STEPS = buildSteps(PV)

export default function TalAiPageWalkthrough({ device = "auto", autoStart = false, popup = false, onExit }: { device?: WalkthroughDevice; autoStart?: boolean; popup?: boolean; onExit?: () => void }) {
  const { dev, restart, switchTo } = useWalkthroughView(device)
  if (!dev) return null // width not known yet - nothing flashes or autostarts
  const phone = dev === "phone"
  return (
    <WalkthroughPlayer key={dev} device={dev} steps={phone ? P_STEPS : D_STEPS} screens={phone ? P_SCREENS : D_SCREENS}
      title={phone ? "TAL AI (phone)" : "TAL AI (computer)"} url={U.talai} autoStart={autoStart || restart} popup={popup} onExit={onExit} onSwitchDevice={switchTo}
      intro={{ title: "TAL AI", subtitle: "Ask anything about life admin - in plain English, with a pointer to the right folder" }} />
  )
}
