"use client"

// "Peace of Mind Planner" walkthrough (browser) for /demo: hand-built copies of
// the real screens with sample data for a made-up family (the Taylors,
// Brisbane) - no sign-in, no API calls. Planner index -> write your wishes ->
// write a letter -> nominate Emma (sister, executor) for that letter -> Settings
// "Share all with..." to pick several sections -> Emma's email -> Emma signs in
// and sees only what was shared -> one PDF of it all.
// Based on: app/(app)/templates/peace-of-mind-planner/page.tsx and [section]/page.tsx,
// components/PlannerLettersEditor, PlannerSingleTextEditor, ShareButton,
// ShareDialog, ShareAllPlannerButton, SharedItemsView, PdfActions,
// lib/services/item-access-email.ts. Canvas 1200 x 760 (see WalkthroughPlayer).

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import {
  Bell, Bot, CheckCircle2, CreditCard, FileText, Folder, Home, Inbox, Lock, Map as MapIcon, Plane, Receipt, Search,
  Send, Settings, Siren, Sparkles, Star, Trash2,
} from "lucide-react"
import WalkthroughPlayer, { type WalkStep } from "./WalkthroughPlayer"

// ── Building blocks ──────────────────────────────────────────────────────────

const Box = ({ x, y, w, h, children, className = "", style }: { x: number; y: number; w: number; h: number; children?: ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`absolute ${className}`} style={{ left: x, top: y, width: w, height: h, ...style }}>{children}</div>
)

const NAV: { t: string; i: typeof Home; badge?: string }[] = [
  { t: "Dashboard", i: Home }, { t: "Setup guide", i: Sparkles }, { t: "The Adulting Life Organiser", i: Folder },
  { t: "Documents", i: FileText }, { t: "Receipts", i: Receipt, badge: "New" }, { t: "Peace of Mind Planner", i: FileText },
  { t: "Learn", i: Plane, badge: "New" }, { t: "TAL AI", i: Bot }, { t: "Tasks", i: CheckCircle2 }, { t: "Reminders", i: Bell },
  { t: "Emergency", i: Siren }, { t: "Settings", i: Settings }, { t: "Subscription", i: CreditCard }, { t: "Maps", i: MapIcon },
]

// The app frame: black sidebar (components/AppSidebar) + cream header (app/(app)/layout.tsx).
function Shell({ active, who = "Sarah", children }: { active: string; who?: "Sarah" | "Emma"; children: ReactNode }) {
  return (
    <div className="absolute inset-0 bg-tal-cream-soft font-sans text-tal-plum" style={{ height: 760 }}>
      <Box x={0} y={0} w={256} h={760} className="bg-black text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons-pwa/icon-192.png" alt="" className="absolute rounded-xl" style={{ left: 88, top: 18, width: 80, height: 80 }} />
        <div className="absolute w-full text-center text-[11px] leading-snug text-white/60" style={{ top: 106 }}>
          Your life. Organised.<br />Your future. Secured.
          <div className="mt-1.5 text-[10px] text-white/45">TAL = The Adulting Life</div>
        </div>
        {NAV.map((n, k) => (
          <div key={n.t} className={`absolute flex items-center gap-3 rounded-xl px-3 text-sm ${active === n.t ? "bg-tal-cream-soft font-medium text-black" : "text-white/85"}`}
            style={{ left: 12, top: 170 + k * 38, width: 232, height: 36 }}>
            <n.i className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} />
            <span className="flex-1 truncate">{n.t}</span>
            {n.badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${active === n.t ? "bg-black text-white" : "bg-white text-black"}`}>{n.badge}</span>}
          </div>
        ))}
      </Box>
      <Box x={256} y={0} w={944} h={64} className="border-b border-tal-line bg-tal-cream-soft" />
      <Box x={280} y={12} w={384} h={40} className="flex items-center gap-2 rounded-full border border-tal-line bg-white px-3 text-sm text-tal-plum-soft"><Search className="h-4 w-4" />Search your organiser…</Box>
      <Box x={672} y={12} w={84} h={40} className="flex items-center justify-center rounded-full border border-tal-line bg-white text-sm font-medium">+ Add</Box>
      <Box x={904} y={12} w={124} h={40} className="flex items-center justify-center gap-2 rounded-full bg-black text-sm font-medium text-white"><Sparkles className="h-4 w-4" />Ask TAL AI</Box>
      <Box x={1038} y={12} w={40} h={40} className="flex items-center justify-center rounded-full"><Bell className="h-5 w-5" strokeWidth={1.6} /></Box>
      <Box x={1086} y={16} w={100} h={32} className="flex items-center gap-2 text-sm">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white ${who === "Sarah" ? "bg-[#6b545a]" : "bg-[#2f5c5c]"}`}>{who[0]}</span>{who}
      </Box>
      {children}
    </div>
  )
}

const X0 = 288 // content left
const CW = 880 // content width

const PdfIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <text x="8" y="17" fontSize="6" fontWeight="700" fill="currentColor">PDF</text>
  </svg>
)
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
// components/PdfActions - [Download PDF] [Share PDF]
const PdfActions = ({ x, y }: { x: number; y: number }) => (
  <>
    <Box x={x} y={y} w={128} h={36} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><PdfIcon />Download PDF</Box>
    <Box x={x + 136} y={y} w={108} h={36} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><MailIcon />Share PDF</Box>
  </>
)
// components/ShareButton - person + plus ("add a trusted person"), green dot once nominated.
const ShareIcon = ({ x, y, shared }: { x: number; y: number; shared?: boolean }) => (
  <Box x={x} y={y} w={36} h={36} className={`flex items-center justify-center rounded-lg border ${shared ? "border-emerald-500 bg-emerald-50" : "border-tal-line bg-white"}`}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 20c.8-3.5 3.2-5.5 6-5.5s5.2 2 6 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
    {shared && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
  </Box>
)
const Overlay = () => <div className="absolute inset-0 bg-black/40" />

// ── 1. Planner index ─────────────────────────────────────────────────────────

type Row = { title: string; hint?: string; organiser: boolean; own?: number; shared?: number }
const SARAH_GROUPS: { g: string; rows: Row[] }[] = [
  { g: "Important Consultants & Contacts", rows: [
    { title: "Attorney(s)", hint: "The people you've appointed as your attorney(s) under a Power of Attorney — shared with the Organiser's Power of Attorney folder.", organiser: true, own: 1 },
    { title: "Doctors", hint: "GP and any specialists — shared with the Organiser's Medical Advisers folder.", organiser: true, own: 2 },
  ] },
  { g: "Will", rows: [{ title: "Information Regarding My Will", hint: "Shared with the Organiser's Will & Funeral Instructions folder.", organiser: true, own: 1 }] },
  { g: "My End-of-Life Plan", rows: [{ title: "Wishes (general)", organiser: false }] },
  { g: "Letters", rows: [{ title: "Letters", organiser: false }] },
]
const EMMA_GROUPS: { g: string; rows: Row[] }[] = [
  { g: "Important Consultants & Contacts", rows: [
    { title: "Attorney(s)", hint: SARAH_GROUPS[0].rows[0].hint, organiser: true, own: 0, shared: 1 },
    { title: "Doctors", hint: SARAH_GROUPS[0].rows[1].hint, organiser: true, own: 1, shared: 2 },
  ] },
  { g: "Will", rows: [{ title: "Information Regarding My Will", hint: SARAH_GROUPS[1].rows[0].hint, organiser: true, own: 0, shared: 1 }] },
  { g: "My End-of-Life Plan", rows: [{ title: "Wishes (general)", organiser: false }] },
  { g: "Letters", rows: [{ title: "Letters", organiser: false }] },
]
// Row y positions (both viewers share the layout): group heading 28, rows 52 apart.
const ROW_Y: Record<string, number> = {}
{
  let y = 360
  for (const grp of SARAH_GROUPS) {
    y += 28
    for (const r of grp.rows) { ROW_Y[r.title] = y; y += 52 }
    y += 4
  }
}

function PlannerIndex({ viewer }: { viewer: "sarah" | "emma" }) {
  const groups = viewer === "sarah" ? SARAH_GROUPS : EMMA_GROUPS
  return (
    <Shell active="Peace of Mind Planner" who={viewer === "sarah" ? "Sarah" : "Emma"}>
      <Box x={X0} y={78} w={300} h={20} className="text-sm text-tal-plum-soft">Dashboard</Box>
      <Box x={X0} y={98} w={600} h={40} className="font-display text-3xl">Peace of Mind Planner</Box>
      <Box x={X0} y={144} w={672} h={44} className="text-[15px] leading-snug text-tal-plum-soft">
        The things your family would need to know if something happened to you. Shared sections show the same data as your Organiser — add, edit or delete from either view.
      </Box>
      <PdfActions x={X0} y={198} />
      <Box x={X0 + 254} y={206} w={500} h={20} className="text-xs text-tal-plum-soft">One document, in the same order as the printed Planner — to keep somewhere safe.</Box>
      {viewer === "sarah" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/thumbnails/banners/planner.jpg" alt="" className="absolute rounded-2xl border border-tal-line object-cover" style={{ left: X0, top: 248, width: 768, height: 100 }} />
      ) : (
        <>
          <Box x={X0} y={248} w={CW} h={100} className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3">
            <div className="mb-1 text-sm font-medium text-violet-900">Shared with you</div>
            <div className="whitespace-nowrap text-[11px] text-violet-900/80">Other Adulting Life users have shared items with you. Open any section below marked <span className="font-semibold">Shared</span> to see what they shared.</div>
          </Box>
          <Box x={X0 + 20} y={306} w={290} h={32} className="flex items-center text-xs font-medium text-violet-900">Everything Sarah Taylor has shared with you:</Box>
          <Box x={X0 + 300} y={306} w={128} h={32} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><PdfIcon />Download PDF</Box>
          <Box x={X0 + 436} y={306} w={108} h={32} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><MailIcon />Share PDF</Box>
        </>
      )}
      {groups.map((grp) => (
        <div key={grp.g}>
          <Box x={X0} y={ROW_Y[grp.rows[0].title] - 26} w={600} h={24} className="font-display text-lg leading-6">{grp.g}</Box>
          {grp.rows.map((r) => (
            <Box key={r.title} x={X0} y={ROW_Y[r.title]} w={CW} h={46} className="flex items-center justify-between gap-3 rounded-xl border border-tal-line bg-white px-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${r.organiser ? "bg-tal-cream-soft ring-1 ring-tal-line" : "bg-white text-tal-plum-soft ring-1 ring-tal-line"}`}>{r.organiser ? "↔" : "◇"}</span>
                <div className="min-w-0">
                  <div className="text-[15px] font-medium leading-tight">{r.title}</div>
                  {r.hint && <div className="truncate text-xs text-tal-plum-soft">{r.hint}</div>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {r.organiser ? (
                  <span className="flex items-center gap-2">
                    <span className={`text-xs ${r.own ? "text-green-700" : "text-tal-plum-soft"}`}>{r.own ? `${r.own} ${r.own === 1 ? "entry" : "entries"}` : "No entries yet"}</span>
                    {r.shared ? <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-800">{r.shared} shared</span> : null}
                  </span>
                ) : <span className="text-xs text-tal-plum-soft">Planner-only</span>}
                <span className="text-sm text-tal-plum-soft">→</span>
              </div>
            </Box>
          ))}
        </div>
      ))}
    </Shell>
  )
}

// ── 2. A Planner section (shared shell) ──────────────────────────────────────

function SectionTop({ title, banner, who = "Sarah", shareIcon, children }: { title: string; banner: string; who?: "Sarah" | "Emma"; shareIcon?: boolean; children: ReactNode }) {
  return (
    <Shell active="Peace of Mind Planner" who={who}>
      <Box x={X0} y={76} w={140} h={36} className="flex items-center gap-1.5 rounded-lg border border-tal-line bg-white px-3 text-sm">‹&nbsp; Back to Planner</Box>
      <Box x={X0} y={118} w={600} h={20} className="text-sm text-tal-plum-soft">Dashboard · Peace of Mind Planner · <span className="text-tal-plum">{title}</span></Box>
      <Box x={X0} y={142} w={420} h={40} className="font-display text-3xl leading-tight">{title}</Box>
      {shareIcon && <ShareIcon x={736} y={144} />}
      <PdfActions x={who === "Emma" ? 924 : 780} y={144} />
      {who === "Sarah" && <Box x={1028} y={144} w={140} h={36} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line text-sm"><span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#217346] text-[9px] font-bold text-white">X</span>Export to Excel</Box>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner} alt="" className="absolute rounded-2xl border border-tal-line object-cover" style={{ left: X0, top: 192, width: 768, height: 90 }} />
      {children}
    </Shell>
  )
}

const PrivacyNotice = ({ y }: { y: number }) => (
  <Box x={X0} y={y} w={CW} h={60} className="flex items-start gap-3 rounded-xl border border-tal-line bg-tal-cream-soft px-4 py-2 text-sm">
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-tal-line"><Lock className="h-3.5 w-3.5" /></span>
    <div>
      <div className="font-medium">Private until you share</div>
      <div className="text-xs text-tal-plum-soft">Only you can see what you write here. Use the <span className="font-medium text-tal-plum">Share</span> button on each entry to send a copy to a specific person — they get an email invite and can only see what you pick.</div>
    </div>
  </Box>
)

const WISHES = `I'd like a small, relaxed farewell — no black, please. Somewhere by the water at Sandgate, with the kids' favourite songs and a sausage sizzle afterwards.

I'd like to be cremated and my ashes scattered at Shorncliffe Pier, where James and I had our first date.

Please donate my clothes to the op shop on Gympie Road, and give my books to Mia — she'll know which ones to keep.

Most of all: keep Saturday pancakes going for Mia and Leo.`

function Wishes() {
  return (
    <SectionTop title="Wishes (general)" banner="/thumbnails/banners/planner-wishes.jpg" shareIcon>
      <PrivacyNotice y={294} />
      <Box x={X0} y={364} w={CW} h={384} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={X0 + 20} y={384} w={CW - 40} h={290} className="whitespace-pre-wrap rounded-xl border border-tal-line px-3 py-2 font-serif text-[15px] leading-relaxed ring-2 ring-tal-plum/30">
        {WISHES}<motion.span className="ml-0.5 inline-block h-4 w-px bg-black align-middle" animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
      </Box>
      <Box x={X0 + 20} y={696} w={200} h={36} className="flex items-center text-xs text-tal-plum-soft">Unsaved changes</Box>
      <Box x={X0 + CW - 20 - 76} y={696} w={76} h={36} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>
    </SectionTop>
  )
}

// ── 3. Letters ───────────────────────────────────────────────────────────────

const LETTER = `If you're reading this, thank you for saying yes to being my executor. You've always been the one I ring first.

Please help James keep things as normal as possible for Mia and Leo — pancakes on Saturdays, footy on Sundays and the beach at Christmas. Everything you'll need is in my Planner.

Love you heaps, Em.
Sarah x`
const LETTERS = [
  { to: "Mia", p: "My darling girl, I am so proud of the kind, brave young woman you're becoming…" },
  { to: "Leo", p: "Hey buddy, remember our camping trip to Noosa when the tent blew away?…" },
  { to: "Emma", p: "If you're reading this, thank you for saying yes to being my executor…" },
]
const LETTER_Y = (n: number) => 434 + n * 56

function Letters({ form, shared }: { form?: boolean; shared?: boolean }) {
  return (
    <SectionTop title="Letters" banner="/thumbnails/banners/planner-letters.jpg">
      <Box x={X0} y={292} w={CW} h={20} className="text-sm text-tal-plum-soft">Write letters to the people who matter to you. Each one starts with &ldquo;Dear&rdquo; and can be as long or short as you like.</Box>
      <PrivacyNotice y={320} />
      {form ? (
        <>
          <Box x={X0} y={386} w={200} h={20} className="text-sm text-tal-plum-soft">← Back to letters</Box>
          <Box x={X0} y={410} w={CW} h={340} className="rounded-2xl border border-tal-line bg-white" />
          <Box x={X0 + 20} y={424} w={200} h={14} className="text-[10px] font-medium uppercase tracking-widest text-tal-plum-soft">New letter</Box>
          <Box x={X0 + 20} y={444} w={200} h={18} className="text-sm text-tal-plum-soft">Dear</Box>
          <Box x={X0 + 20} y={464} w={CW - 40} h={40} className="flex items-center rounded-xl border border-tal-line px-3 text-sm">Emma</Box>
          <Box x={X0 + 20} y={512} w={200} h={18} className="text-sm text-tal-plum-soft">Your letter</Box>
          <Box x={X0 + 20} y={532} w={CW - 40} h={160} className="overflow-hidden whitespace-pre-wrap rounded-xl border border-tal-line px-3 py-2 font-serif text-[13px] leading-snug ring-2 ring-tal-plum/30">{LETTER}</Box>
          <Box x={X0 + CW - 20 - 76 - 92} y={702} w={84} h={36} className="flex items-center justify-center rounded-xl text-sm">Cancel</Box>
          <Box x={X0 + CW - 20 - 76} y={702} w={76} h={36} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Save</Box>
        </>
      ) : (
        <>
          <Box x={X0} y={392} w={200} h={36} className="flex items-center text-sm text-tal-plum-soft">3 letters</Box>
          <Box x={X0 + CW - 112} y={392} w={112} h={36} className="flex items-center justify-center gap-1.5 rounded-xl bg-black text-sm font-medium text-white">+ Add letter</Box>
          {LETTERS.map((l, n) => (
            <Box key={l.to} x={X0} y={LETTER_Y(n)} w={CW} h={50} className="flex items-center gap-2 rounded-xl border border-tal-line bg-white px-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium leading-tight">Dear {l.to}</div>
                <div className="truncate text-xs text-tal-plum-soft">{l.p}</div>
              </div>
              <span className="mr-12 text-tal-plum-soft">›</span>
            </Box>
          ))}
          {LETTERS.map((l, n) => <ShareIcon key={l.to} x={X0 + CW - 50} y={LETTER_Y(n) + 7} shared={shared && l.to === "Emma"} />)}
        </>
      )}
    </SectionTop>
  )
}

// ShareDialog ("Nominate a trusted person"), over the letters list.
const SD = { x: 376, y: 214, w: 448 }
function NominateDialog({ done }: { done?: boolean }) {
  return (
    <>
      <Letters shared={done} />
      <Overlay />
      <Box x={SD.x} y={SD.y} w={SD.w} h={330} className="overflow-hidden rounded-2xl bg-white text-tal-plum shadow-lg">
        <div className="border-b border-tal-line px-5 py-4" style={{ height: 104 }}>
          <div className="font-display text-lg">Nominate a trusted person</div>
          <p className="mt-1 text-xs text-tal-plum-soft">Nominate someone you trust to receive <span className="font-medium">Letter to Emma</span>. It will appear in their Peace of Mind Planner and they&apos;ll get an email letting them know.</p>
        </div>
      </Box>
      {done ? (
        <Box x={SD.x + 20} y={SD.y + 116} w={SD.w - 40} h={44} className="flex items-center justify-between rounded-lg border border-tal-line bg-tal-cream-soft/40 px-3 text-sm">
          <span>emma.clarke@example.com</span><span className="text-xs text-red-700">Remove</span>
        </Box>
      ) : (
        <Box x={SD.x + 20} y={SD.y + 126} w={SD.w - 40} h={20} className="text-sm italic text-tal-plum-soft">You haven&apos;t nominated anyone yet.</Box>
      )}
      <Box x={SD.x + 20} y={SD.y + 172} w={SD.w - 40} h={1} className="bg-tal-line" />
      <Box x={SD.x + 20} y={SD.y + 184} w={300} h={16} className="text-xs uppercase tracking-widest text-tal-plum-soft">Nominate by email</Box>
      <Box x={SD.x + 20} y={SD.y + 204} w={296} h={40} className={`flex items-center rounded-xl border px-3 text-sm ${done ? "border-tal-line text-tal-plum-soft" : "border-tal-plum text-tal-plum ring-2 ring-tal-plum/30"}`}>{done ? "name@example.com" : "emma.clarke@example.com"}</Box>
      <Box x={SD.x + 324} y={SD.y + 204} w={104} h={40} className={`flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white ${done ? "opacity-60" : ""}`}>Nominate</Box>
      <Box x={SD.x} y={SD.y + 264} w={SD.w} h={1} className="bg-tal-line" />
      <Box x={SD.x + 12} y={SD.y + 278} w={190} h={36} className="flex items-center gap-1.5 px-3 text-sm text-tal-plum">☰ View all nominations</Box>
      <Box x={SD.x + SD.w - 84} y={SD.y + 278} w={64} h={36} className="flex items-center justify-center rounded-xl text-sm text-tal-plum">Done</Box>
    </>
  )
}

// ── 4. Settings: "What you've shared" + Share all with… ──────────────────────

function SettingsShared() {
  return (
    <Shell active="Settings">
      <Box x={X0} y={76} w={CW} h={60} className="flex items-center gap-3 rounded-2xl bg-black px-6 text-white shadow-md">
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">Settings</span>
        <span className="font-display text-2xl">Your account</span>
      </Box>
      <Box x={X0} y={152} w={CW} h={250} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={X0 + 24} y={174} w={400} h={30} className="font-display text-xl">What you&apos;ve shared</Box>
      <Box x={X0 + CW - 24 - 120} y={172} w={120} h={36} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Share all with…</Box>
      <Box x={X0 + 24} y={214} w={CW - 200} h={40} className="text-sm leading-snug text-tal-plum-soft">
        Every item you&apos;ve shared, and who can see it. Click a green <span className="mx-1 inline-flex rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">view</span> badge to revoke access, or a dash to grant access to someone already listed.
      </Box>
      <Box x={X0 + 24} y={270} w={CW - 48} h={102} className="overflow-hidden rounded-2xl border border-tal-line text-sm">
        <div className="flex h-14 items-center bg-tal-cream-soft">
          <span className="flex-1 px-4 font-medium">Item</span>
          <span className="w-56 text-center font-medium leading-tight">Emma Clarke<span className="block text-[10px] font-normal text-tal-plum-soft">emma.clarke@example.com</span></span>
        </div>
        <div className="flex h-11 items-center border-t border-tal-line/60">
          <span className="flex-1 px-4">Letter to Emma <span className="block text-[11px] text-tal-plum-soft">Letters</span></span>
          <span className="w-56 text-center"><span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">✓ view</span></span>
        </div>
      </Box>
    </Shell>
  )
}

// ShareAllPlannerButton dialog.
const SA = { x: 264, y: 40, w: 672 }
const SHAREABLE: { g: string; items: { t: string; off?: boolean }[] }[] = [
  { g: "Letters", items: [{ t: "Letter to Emma" }, { t: "Letter to Leo", off: true }, { t: "Letter to Mia", off: true }] },
  { g: "Power of Attorney Details", items: [{ t: "Power of Attorney Details — details" }] },
  { g: "TAL — List of Medical Advisers", items: [{ t: "TAL — List of Medical Advisers — entry 1" }, { t: "TAL — List of Medical Advisers — entry 2" }] },
  { g: "Will & Funeral Instructions", items: [{ t: "Will & Funeral Instructions — details" }] },
  { g: "Wishes", items: [{ t: "Wishes — children" }, { t: "Wishes — general" }] },
]
const SHARE_TOP: number[] = SHAREABLE.reduce<number[]>((acc, grp, n) => [...acc, n === 0 ? SA.y + 160 : acc[n - 1] + 24 + SHAREABLE[n - 1].items.length * 28 + 8], [])
function ShareAll({ done }: { done?: boolean }) {
  return (
    <>
      <SettingsShared />
      <Overlay />
      <Box x={SA.x} y={SA.y} w={SA.w} h={680} className="rounded-2xl bg-white text-tal-plum shadow-lg" />
      <Box x={SA.x} y={SA.y} w={SA.w} h={96} className="border-b border-tal-line px-6 pt-6">
        <div className="font-display text-lg">Share Planner items with someone</div>
        <p className="mt-1 text-sm text-tal-plum-soft">Pick the items to share. The recipient must already have an Adulting Life account (their email).</p>
      </Box>
      <Box x={SA.x + 24} y={SA.y + 112} w={SA.w - 48} h={32} className="flex items-center gap-2 text-sm">
        <span className="flex h-8 items-center rounded-lg border border-tal-line px-3">Check all</span>
        <span className="flex h-8 items-center rounded-lg border border-tal-line px-3">Uncheck all</span>
        <span className="ml-auto text-xs text-tal-plum-soft">7 of 9 selected</span>
      </Box>
      {SHAREABLE.map((grp, gi) => {
        const top = SHARE_TOP[gi]
        return (
          <div key={grp.g}>
            <Box x={SA.x + 24} y={top} w={500} h={18} className="text-[10px] font-semibold uppercase tracking-widest text-tal-plum-soft">{grp.g}</Box>
            {grp.items.map((it, n) => (
              <Box key={it.t} x={SA.x + 24} y={top + 22 + n * 28} w={SA.w - 48} h={26} className="flex items-center gap-2 rounded-lg px-2">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border text-[10px] text-white ${it.off ? "border-gray-400 bg-white" : "border-blue-600 bg-blue-600"}`}>{it.off ? "" : "✓"}</span>
                <span className="flex-1 text-sm">{it.t}</span>
                {done && !it.off && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-emerald-700">Shared</span>}
              </Box>
            ))}
          </div>
        )
      })}
      {done && <Box x={SA.x + 24} y={SA.y + 572} w={SA.w - 48} h={36} className="flex items-center rounded-lg bg-tal-cream-soft px-3 text-sm">Shared 7 of 7.</Box>}
      <Box x={SA.x} y={SA.y + 616} w={SA.w} h={1} className="bg-tal-line" />
      <Box x={SA.x + 24} y={SA.y + 628} w={400} h={40} className="flex items-center rounded-xl border border-tal-line px-3 text-sm">emma.clarke@example.com</Box>
      <Box x={SA.x + 432} y={SA.y + 628} w={80} h={40} className="flex items-center justify-center rounded-xl text-sm">{done ? "Close" : "Cancel"}</Box>
      <Box x={SA.x + 520} y={SA.y + 628} w={128} h={40} className={`flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white ${done ? "opacity-60" : ""}`}>Share 7</Box>
    </>
  )
}

// ── 5. Emma's inbox ──────────────────────────────────────────────────────────

const MAIL_ITEMS = ["Letter to Emma", "Wishes — general", "Wishes — children", "Will & Funeral Instructions — details", "Power of Attorney Details — details"]
function EmmaInbox() {
  return (
    <div className="absolute inset-0 bg-white font-sans text-gray-900" style={{ height: 760 }}>
      <Box x={0} y={0} w={1200} h={56} className="flex items-center gap-4 border-b border-gray-200 bg-gray-50 px-5">
        <span className="flex items-center gap-2 text-lg font-semibold text-sky-700"><Inbox className="h-5 w-5" />Mail</span>
        <span className="flex h-9 w-96 items-center gap-2 rounded-lg bg-white px-3 text-sm text-gray-400 ring-1 ring-gray-200"><Search className="h-4 w-4" />Search mail</span>
        <span className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#2f5c5c] text-sm font-semibold text-white">E</span>
      </Box>
      <Box x={0} y={56} w={190} h={704} className="space-y-1 border-r border-gray-200 bg-gray-50 p-3 text-sm">
        <div className="flex items-center gap-2 rounded-lg bg-sky-100 px-3 py-2 font-semibold text-sky-800"><Inbox className="h-4 w-4" />Inbox <span className="ml-auto">7</span></div>
        <div className="flex items-center gap-2 px-3 py-2 text-gray-600"><Star className="h-4 w-4" />Starred</div>
        <div className="flex items-center gap-2 px-3 py-2 text-gray-600"><Send className="h-4 w-4" />Sent</div>
        <div className="flex items-center gap-2 px-3 py-2 text-gray-600"><Trash2 className="h-4 w-4" />Bin</div>
      </Box>
      <Box x={190} y={56} w={380} h={704} className="border-r border-gray-200">
        {MAIL_ITEMS.map((it, n) => (
          <div key={it} className={`border-b border-gray-100 px-4 py-3 ${n === 0 ? "bg-sky-50" : ""}`}>
            <div className="flex justify-between text-sm"><span className="font-semibold">The Adulting Life</span><span className="text-xs text-gray-500">10:5{8 - n} am</span></div>
            <div className="truncate text-sm font-medium">Sarah Taylor has shared something with you in The Adulting Life</div>
            <div className="truncate text-xs text-gray-500">Sarah Taylor has shared {it} with you in their Peace of Mind Planner.</div>
          </div>
        ))}
      </Box>
      <Box x={600} y={84} w={570} h={60} className="text-xl font-semibold leading-snug">Sarah Taylor has shared something with you in The Adulting Life</Box>
      <Box x={600} y={152} w={570} h={40} className="flex items-center gap-3 text-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons-pwa/icon-96.png" alt="" className="h-9 w-9 rounded-full" />
        <div><span className="font-semibold">The Adulting Life</span><span className="block text-xs text-gray-500">to emma.clarke@example.com · 10:58 am</span></div>
      </Box>
      <Box x={600} y={210} w={560} h={330} className="space-y-4 text-[15px] leading-relaxed">
        <p>Hi Emma,</p>
        <p>Sarah Taylor has shared Letter to Emma with you in their Peace of Mind Planner.</p>
        <p>You can view it any time by signing in:<br /><span className="text-sky-700 underline">https://app.theadultinglife.com.au/templates/peace-of-mind-planner</span></p>
        <p>They can remove your access at any time. This message is a notification only — reply to Sarah Taylor directly if you have questions.</p>
        <p>— The Adulting Life</p>
      </Box>
    </div>
  )
}

// ── 6. Emma's view of a shared letter ────────────────────────────────────────

function EmmaLetter() {
  return (
    <SectionTop title="Letters" banner="/thumbnails/banners/planner-letters.jpg" who="Emma">
      <Box x={X0} y={300} w={CW} h={1} className="bg-tal-line" />
      <Box x={X0} y={318} w={400} h={28} className="font-display text-xl">Shared with you</Box>
      <Box x={X0} y={348} w={CW} h={18} className="text-xs text-tal-plum-soft">These items belong to other Adulting Life users who have chosen to share them with you. Read-only.</Box>
      <Box x={X0} y={382} w={400} h={16} className="text-xs uppercase tracking-widest text-tal-plum-soft">Shared by Sarah Taylor</Box>
      <Box x={X0} y={406} w={CW} h={250} className="rounded-xl border border-tal-line bg-tal-cream-soft/40 px-4 py-3">
        <div className="mb-1 font-medium">Dear Emma</div>
        <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed">{LETTER}</div>
      </Box>
    </SectionTop>
  )
}

// ── 7. The PDF ───────────────────────────────────────────────────────────────

const Sec = ({ t, children }: { t: string; children: ReactNode }) => (
  <div className="mb-3">
    <div className="mb-1 border-b border-[#e6dcd0] pb-0.5 font-display text-[13px] font-semibold">{t}</div>
    <div className="text-[11px] leading-snug text-gray-700">{children}</div>
  </div>
)
function SharedPdf() {
  return (
    <div className="absolute inset-0 bg-[#525659] font-sans" style={{ height: 760 }}>
      <Box x={0} y={0} w={1200} h={40} className="flex items-center gap-4 bg-[#323639] px-5 text-sm text-white">
        <span>Peace of Mind Planner - shared by Sarah Taylor.pdf</span><span className="ml-auto text-white/70">1 / 4</span>
      </Box>
      <Box x={330} y={60} w={540} h={700} className="bg-white px-12 pt-10 text-tal-plum shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Logo.png" alt="" className="mb-4 h-12" />
        <div className="font-display text-2xl">Peace of Mind Planner</div>
        <div className="mb-5 text-xs text-tal-plum-soft">Shared with Emma Clarke by Sarah Taylor · 17 November 2026</div>
        <Sec t="Doctors">Dr Priya Nair (GP) — Northside Family Practice, Chermside · 07 3555 0142<br />Dr Tom Becker (Dermatologist) — Kedron Skin Clinic · 07 3555 0187</Sec>
        <Sec t="Attorney(s)">Enduring Power of Attorney: Emma Clarke (sister) and James Taylor (partner), jointly. Signed March 2024. Original in the fire safe at home.</Sec>
        <Sec t="Information Regarding My Will">Will signed 12 March 2024 with Harbourside Legal, Brisbane. Executor: Emma Clarke. Original held by the solicitor.</Sec>
        <Sec t="Wishes (general)">{WISHES.split("\n\n")[0]}</Sec>
        <Sec t="Letters">Dear Emma — {LETTER.split("\n\n")[0]}</Sec>
        <div className="absolute bottom-6 left-12 right-12 flex justify-between text-[9px] text-gray-400"><span>Made by The Adulting Life</span><span>Sample data</span></div>
      </Box>
    </div>
  )
}

// ── Steps ────────────────────────────────────────────────────────────────────

const SCREENS: Record<string, ReactNode> = {
  index: <PlannerIndex viewer="sarah" />,
  wishes: <Wishes />,
  letterForm: <Letters form />,
  letters: <Letters />,
  nominate: <NominateDialog />,
  nominated: <NominateDialog done />,
  settings: <SettingsShared />,
  shareAll: <ShareAll />,
  shareAllDone: <ShareAll done />,
  inbox: <EmmaInbox />,
  emmaIndex: <PlannerIndex viewer="emma" />,
  emmaLetter: <EmmaLetter />,
  pdf: <SharedPdf />,
}

const U = "app.theadultinglife.com.au"
const STEPS: WalkStep[] = [
  { screen: "index", caption: "Your Peace of Mind Planner", detail: "Everything your family would need to know if something happened to you - contacts, your will, your wishes, letters. Download it all as one PDF any time.",
    url: `${U}/templates/peace-of-mind-planner`, duration: 7000 },
  { screen: "index", caption: "Important contacts come straight from your Organiser", detail: "Doctors, attorneys and your will are the same entries as your Organiser folders - fill them in once, they show up in both.",
    url: `${U}/templates/peace-of-mind-planner`, focus: { x: 728, y: 470, scale: 1.35 }, ring: { x: X0, y: ROW_Y["Attorney(s)"], w: CW, h: 98 }, duration: 7000 },
  { screen: "index", caption: "Open Wishes", url: `${U}/templates/peace-of-mind-planner`,
    focus: { x: 728, y: 600, scale: 1.35 }, ring: { x: X0, y: ROW_Y["Wishes (general)"], w: CW, h: 46 }, click: { x: 420, y: ROW_Y["Wishes (general)"] + 23 }, duration: 5500 },
  { screen: "wishes", caption: "Write your wishes in your own words", detail: "The kind of farewell you'd like, what happens to your things - private until you choose to share it.",
    url: `${U}/templates/peace-of-mind-planner/wishes-general`, focus: { x: 728, y: 520, scale: 1.3 }, ring: { x: X0 + 20, y: 384, w: CW - 40, h: 290 }, click: { x: 1130, y: 714 }, duration: 8000 },
  { screen: "letterForm", caption: "Letters to the people you love", detail: "Each one starts with \"Dear\". Sarah writes to her sister Emma, who's also her executor.",
    url: `${U}/templates/peace-of-mind-planner/letters`, focus: { x: 728, y: 580, scale: 1.3 }, ring: { x: X0, y: 410, w: CW, h: 340 }, click: { x: 1130, y: 720 }, duration: 8000 },
  { screen: "letters", caption: "Share one letter with one person", detail: "Every entry has its own share button. Mia's and Leo's letters stay private.",
    url: `${U}/templates/peace-of-mind-planner/letters`, focus: { x: 900, y: 520, scale: 1.5 }, ring: { x: X0 + CW - 50, y: LETTER_Y(2) + 7, w: 36, h: 36 }, click: { x: X0 + CW - 32, y: LETTER_Y(2) + 25 }, duration: 6500 },
  { screen: "nominate", caption: "Nominate a trusted person", detail: "Type Emma's email. It will appear in her Planner and she gets an email.",
    url: `${U}/templates/peace-of-mind-planner/letters`, focus: { x: 600, y: 380, scale: 1.55 }, ring: { x: SD.x + 20, y: SD.y + 204, w: 296, h: 40 }, click: { x: SD.x + 376, y: SD.y + 224 }, duration: 7000 },
  { screen: "nominated", caption: "Done - Emma can read it", detail: "You can remove her at any time.",
    url: `${U}/templates/peace-of-mind-planner/letters`, focus: { x: 600, y: 360, scale: 1.55 }, ring: { x: SD.x + 20, y: SD.y + 116, w: SD.w - 40, h: 44 }, duration: 5500 },
  { screen: "settings", caption: "Or share several sections at once", detail: "Settings shows everything you've shared and who can see it. \"Share all with...\" picks many at once.",
    url: `${U}/settings`, focus: { x: 800, y: 300, scale: 1.4 }, ring: { x: X0 + CW - 144, y: 172, w: 120, h: 36 }, click: { x: X0 + CW - 84, y: 190 }, duration: 7000 },
  { screen: "shareAll", caption: "Choose exactly what your executor sees", detail: "Her letter, your doctors, power of attorney, will and wishes - but not the children's letters.",
    url: `${U}/settings`, focus: { x: 600, y: 400, scale: 1.2 }, ring: { x: SA.x + 16, y: SA.y + 156, w: SA.w - 32, h: 410 }, click: { x: SA.x + 584, y: SA.y + 648 }, duration: 8000 },
  { screen: "shareAllDone", caption: "Shared 7 of 7", url: `${U}/settings`,
    focus: { x: 600, y: 520, scale: 1.3 }, ring: { x: SA.x + 24, y: SA.y + 572, w: SA.w - 48, h: 36 }, duration: 5000 },
  { screen: "inbox", caption: "Emma gets an email", detail: "It says what Sarah shared and links her to the Planner. No details are in the email itself.",
    url: "mail.example.com/inbox", focus: { x: 880, y: 330, scale: 1.35 }, duration: 7500 },
  { screen: "emmaIndex", caption: "Emma signs in - and sees only what was shared", detail: "Sections Sarah shared are marked Shared. Nothing else of Sarah's is visible.",
    url: `${U}/templates/peace-of-mind-planner`, focus: { x: 728, y: 400, scale: 1.2 }, ring: { x: X0, y: 248, w: CW, h: 100 }, duration: 7500 },
  { screen: "emmaLetter", caption: "Read-only, exactly as Sarah wrote it", detail: "Her own letter - not Mia's or Leo's.",
    url: `${U}/templates/peace-of-mind-planner/letters`, focus: { x: 728, y: 520, scale: 1.3 }, ring: { x: X0, y: 406, w: CW, h: 250 }, duration: 7000 },
  { screen: "emmaIndex", caption: "One PDF of everything shared", url: `${U}/templates/peace-of-mind-planner`,
    focus: { x: 620, y: 320, scale: 1.7 }, ring: { x: X0 + 296, y: 302, w: 136, h: 40 }, click: { x: X0 + 364, y: 322 }, duration: 5500 },
  { screen: "pdf", caption: "Print it, save it or email it", detail: "The same branded PDF - to keep somewhere safe.",
    url: `${U}/api/export/doc?kind=planner-shared`, focus: { x: 600, y: 380, scale: 1.15 }, duration: 7000 },
]

export default function PlannerWalkthrough({ autoStart = false }: { autoStart?: boolean }) {
  return (
    <WalkthroughPlayer music="/audio/pop-dance-music.mp3" steps={STEPS} screens={SCREENS} title="Peace of Mind Planner" autoStart={autoStart} url={`${U}/templates/peace-of-mind-planner`}
      intro={{ title: "Peace of Mind Planner", subtitle: "Your wishes, letters and important contacts - shared only with the people you choose." }} />
  )
}
