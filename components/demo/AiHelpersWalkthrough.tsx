"use client"

// "AI writing helpers" walkthrough (browser) for /demo: hand-built copies of the
// real screens with sample data for a made-up family (the Taylors, Brisbane) -
// no sign-in, no API calls. Resume folder -> "Write my résumé with AI" coach ->
// answer a few questions -> draft -> "Add to my form" -> check and Save ->
// TAL AI: "What does Mia need for her first job?" -> answer that points into the app ->
// Dictate (talk instead of typing) -> Polish (tidy my wording).
// Based on: app/(app)/records/[category]/[subcategory]/page.tsx, components/PageForm
// (coach button, entries, Save), FormCoach + CoachChat, lib/form-coaches.ts
// ("employment.resume"), app/(app)/tal-ai/page.tsx + components/TalAiChat,
// components/SmartTextarea (Dictate / Polish / "Review polish suggestion").
// Canvas 1200 x 760 (see WalkthroughPlayer); the résumé entry screen scrolls.

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import {
  Bell, Bot, CheckCircle2, CreditCard, FileText, Folder, Home, Map as MapIcon, Plane, Receipt, Search, Settings, Siren, Sparkles,
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
// The whole page scrolls in the real app, sidebar included, so tall screens draw it full height.
function Shell({ active, h = 760, children }: { active: string; h?: number; children: ReactNode }) {
  return (
    <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
      <Box x={0} y={0} w={256} h={h} className="bg-black text-white">
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
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6b545a] text-sm font-semibold text-white">S</span>Sarah
      </Box>
      {children}
    </div>
  )
}

const X0 = 288
const CW = 880
const Overlay = ({ h = 760 }: { h?: number }) => <div className="absolute left-0 top-0 w-full bg-black/40" style={{ height: h }} />
const PdfIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <text x="8" y="17" fontSize="6" fontWeight="700" fill="currentColor">PDF</text>
  </svg>
)
const MicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
)

// ── 1. The Resume folder ─────────────────────────────────────────────────────

const COACH_BTN = { x: X0 + CW - 248, y: 196, w: 248, h: 40 }

function FolderTop() {
  return (
    <>
      <Box x={X0} y={76} w={600} h={22} className="flex items-center gap-2 text-sm text-tal-plum-soft">
        The Adulting Life Organiser <span className="text-tal-plum-soft/50">·</span> Employment <span className="text-tal-plum-soft/50">·</span>
        <span className="rounded-full border border-tal-line bg-white px-2.5 py-0.5 text-tal-plum">Sarah Taylor ▾</span>
      </Box>
      <Box x={X0} y={108} w={CW} h={72} className="flex items-center gap-4 rounded-2xl bg-black px-5 text-white shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/thumbnails/subcategories/employment.resume.png" alt="" className="h-12 w-12 rounded-xl bg-white object-cover ring-2 ring-white/20" />
        <span className="flex-1 font-display text-2xl">Resume</span>
        <span className="flex h-9 items-center gap-1.5 rounded-xl border border-white/30 px-3 text-sm"><span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#217346] text-[9px] font-bold">X</span>Export to Excel</span>
      </Box>
      <Box {...COACH_BTN} className="flex items-center justify-center gap-2 rounded-xl bg-black text-sm font-medium text-white">✨ Write my résumé with AI</Box>
    </>
  )
}

function ResumeFolder() {
  return (
    <Shell active="The Adulting Life Organiser">
      <FolderTop />
      <Box x={X0} y={260} w={CW} h={48} className="flex items-center justify-between rounded-xl border border-tal-line bg-white/70 px-4">
        <span className="font-display text-sm uppercase tracking-widest">Past resumes <span className="ml-1 font-sans normal-case tracking-normal text-tal-plum-soft">(1)</span></span>
        <span className="text-lg text-tal-plum-soft">+</span>
      </Box>
      <Box x={X0} y={332} w={140} h={40} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-sm font-medium">+ Add another</Box>
    </Shell>
  )
}

// ── 2. "Write my résumé with AI" (CoachChat) ─────────────────────────────────

const CD = { x: 264, y: 46, w: 672, h: 668 }
const OPENING = "Hi! I'll help you put together a résumé by asking a few questions, then draft it for you to check. What kind of job is this résumé for? If you have an old résumé or a job ad, paste it in."
const A1 = "Practice manager roles at medical clinics around Brisbane. I've been the office manager at a physio clinic for six years."
const Q2 = "Great fit. What's your name, phone, email and suburb? And for the physio clinic: the employer, your start date, and two or three things you do there?"
const A2 = "Sarah Taylor, 0400 000 000, sarah.taylor@example.com, Aspley QLD. Office Manager at Kedron Park Physio since March 2020 — I run the front desk team of 4, moved us to online bookings and look after Medicare and health fund claims. Before that, medical receptionist at Northside Family Practice 2014–2020."
const Q3 = "Thanks Sarah. Any qualifications, licences or certificates — and a few key skills?"
const A3 = "Cert IV in Business Administration (2013), first aid certificate, driver's licence. Skills: Medicare billing, Cliniko, rostering, Xero."
const RESUME = `SARAH TAYLOR
0400 000 000 · sarah.taylor@example.com · Aspley, QLD

CAREER SUMMARY
Office manager with 12 years in allied health and general practice, looking for a practice manager role at a Brisbane medical clinic.

EXPERIENCE
Office Manager — Kedron Park Physio, March 2020 – Present
- Lead a front desk team of four
- Moved the clinic to online bookings
- Manage Medicare and health fund claims
Medical Receptionist — Northside Family Practice, 2014 – 2020

EDUCATION
Certificate IV in Business Administration, 2013

LICENCES & CERTIFICATES
First aid certificate · Driver's licence

SKILLS
Medicare billing, Cliniko, rostering, Xero

REFEREES
Available on request`

const Bubble = ({ me, children }: { me?: boolean; children: ReactNode }) => (
  <div className={`flex ${me ? "justify-end" : "justify-start"}`}>
    <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${me ? "rounded-br-md bg-black text-white" : "rounded-bl-md border border-tal-line bg-white"}`}>{children}</div>
  </div>
)

function Coach({ stage }: { stage: 1 | 2 | 3 }) {
  const footTop = stage === 3 ? CD.y + CD.h - 150 : CD.y + CD.h - 100
  const typed = stage === 1 ? A1 : ""
  return (
    <>
      <ResumeFolder />
      <Overlay />
      <Box x={CD.x} y={CD.y} w={CD.w} h={CD.h} className="overflow-hidden rounded-2xl bg-white shadow-xl" />
      <Box x={CD.x} y={CD.y} w={CD.w} h={72} className="flex items-start justify-between border-b border-tal-line px-5 py-4">
        <div><div className="font-display text-lg">Write my résumé with AI</div><p className="mt-0.5 text-xs text-tal-plum-soft">Answer in your own words. Nothing is saved until you add the draft.</p></div>
        <span className="text-xl text-tal-plum-soft">×</span>
      </Box>
      <Box x={CD.x} y={CD.y + 72} w={CD.w} h={footTop - CD.y - 72} className={`flex flex-col gap-3 overflow-hidden bg-tal-cream-soft/40 px-5 py-4 ${stage === 1 ? "justify-start" : "justify-end"}`}>
        {stage === 1 && <Bubble>{OPENING}</Bubble>}
        {stage === 2 && <><Bubble>{OPENING}</Bubble><Bubble me>{A1}</Bubble><Bubble>{Q2}</Bubble><Bubble me>{A2}</Bubble><Bubble>{Q3}</Bubble><Bubble me>{A3}</Bubble></>}
        {stage === 3 && (
          <>
            <Bubble me>{A3}</Bubble>
            <Bubble>Here&apos;s your draft. Have a look, and tell me anything you&apos;d like changed.</Bubble>
            <div className="shrink-0 space-y-2 rounded-2xl border-2 border-tal-forest/40 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-tal-forest">Your draft</div>
              <div><div className="text-[10px] uppercase tracking-widest text-tal-plum-soft">Title</div><div className="text-sm">Résumé — practice manager roles 2027</div></div>
              <div><div className="text-[10px] uppercase tracking-widest text-tal-plum-soft">Date</div><div className="text-sm">17/11/2026</div></div>
              <div><div className="text-[10px] uppercase tracking-widest text-tal-plum-soft">Résumé</div><div className="h-[150px] overflow-hidden whitespace-pre-line text-[13px] leading-snug">{RESUME}</div></div>
              <p className="text-[11px] italic text-tal-plum-soft">Standard terms apply. AI answers are a guide only, not personal advice. Always check important decisions with the right professional.</p>
            </div>
          </>
        )}
      </Box>
      <Box x={CD.x} y={footTop} w={CD.w} h={1} className="bg-tal-line" />
      {stage === 3 && (
        <>
          <Box x={CD.x + 20} y={footTop + 10} w={360} h={40} className="flex items-center text-xs text-tal-plum-soft">Want changes? Keep chatting and ask for a new draft.</Box>
          <Box x={CD.x + CD.w - 20 - 140} y={footTop + 10} w={140} h={40} className="flex items-center justify-center rounded-xl bg-tal-forest text-sm font-medium text-white">Add to my form</Box>
        </>
      )}
      <Box x={CD.x + 20} y={CD.y + CD.h - 88} w={CD.w - 40 - 96} h={56} className={`rounded-xl border px-3 py-2 text-sm ${typed ? "border-tal-plum ring-2 ring-tal-plum/30" : "border-tal-line text-tal-plum-soft"}`}>{typed || "Type your answer…"}</Box>
      <Box x={CD.x + CD.w - 20 - 88} y={CD.y + CD.h - 88} w={88} h={40} className={`flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white ${typed ? "" : "opacity-50"}`}>Send</Box>
      {stage === 2 && <Box x={CD.x + CD.w - 20 - 88} y={CD.y + CD.h - 42} w={88} h={30} className="flex items-center justify-center rounded-lg border border-tal-line text-xs">Draft it now</Box>}
    </>
  )
}

// ── 3. The draft as a new entry (tall, scrolled) ─────────────────────────────

const ENTRY_H = 1420
const E = { y: 290, h: 900 }
const NOTES_Y = 972
const ROUGH = "follow up with the practice manager job at hillcrest medical next tuesday they said call after 2 and bring my first aid certificate and references"
const POLISHED = "Follow up on the practice manager job at Hillcrest Medical next Tuesday. They said to call after 2 pm. Bring my first aid certificate and references."

type EntryState = "draft" | "saved" | "recording" | "rough"
const Label = ({ children }: { children: ReactNode }) => <div className="mb-1 text-xs uppercase tracking-wider text-tal-plum-soft">{children}</div>
const SmartRow = ({ y, rec }: { y: number; rec?: boolean }) => (
  <Box x={X0 + 16} y={y} w={400} h={32} className="flex items-center gap-2">
    <span className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium ${rec ? "bg-red-600 text-white" : "border border-tal-line bg-white"}`}>
      {rec ? <><motion.span className="inline-block h-2 w-2 rounded-full bg-white" animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} />Stop</> : <><MicIcon />Dictate</>}
    </span>
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-tal-line text-[11px] font-bold text-tal-plum-soft">?</span>
    <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 text-xs font-medium text-violet-800">✨ Polish</span>
  </Box>
)

function ResumeEntry({ state, polish }: { state: EntryState; polish?: number }) {
  const saved = state !== "draft"
  const notes = state === "rough" ? ROUGH : state === "recording" ? "follow up with the practice manager job at hillcrest medical" : ""
  return (
    <Shell active="The Adulting Life Organiser" h={ENTRY_H}>
      <FolderTop />
      <Box x={X0} y={262} w={400} h={20} className="font-display text-sm uppercase tracking-widest">Current resumes</Box>
      <Box x={X0} y={E.y} w={CW} h={E.h} className="rounded-2xl border border-tal-line bg-white" />
      <Box x={X0 + 16} y={E.y + 14} w={500} h={28} className="flex items-center gap-2 text-sm font-medium">
        Résumé — practice manager roles 2027
        {!saved && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">Not saved yet</span>}
      </Box>
      {saved && (
        <>
          <Box x={X0 + CW - 16 - 36 - 8 - 244} y={E.y + 10} w={128} h={36} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><PdfIcon />Download PDF</Box>
          <Box x={X0 + CW - 16 - 36 - 8 - 108} y={E.y + 10} w={108} h={36} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm">✉ Share PDF</Box>
          <Box x={X0 + CW - 16 - 36} y={E.y + 10} w={36} h={36} className="flex items-center justify-center rounded-xl border border-tal-line bg-white text-red-700">🗑</Box>
        </>
      )}
      <Box x={X0 + 16} y={E.y + 56} w={CW - 32} h={64}>
        <Label>Resume document</Label>
        <div className="flex h-10 items-center gap-3 rounded-xl border border-dashed border-tal-line px-3 text-sm text-tal-plum-soft"><span className="rounded-lg border border-tal-line bg-white px-2.5 py-1 text-tal-plum">Upload</span>Upload the resume (PDF or photo)</div>
      </Box>
      <Box x={X0 + 16} y={E.y + 132} w={CW - 32} h={60}><Label>Title</Label><div className="flex h-10 items-center rounded-xl border border-tal-line px-3 text-sm">Résumé — practice manager roles 2027</div></Box>
      <Box x={X0 + 16} y={E.y + 204} w={CW / 2 - 24} h={60}><Label>Date</Label><div className="flex h-10 items-center rounded-xl border border-tal-line px-3 text-sm">17/11/2026</div></Box>
      <Box x={X0 + CW / 2 + 8} y={E.y + 204} w={CW / 2 - 24} h={90}>
        <Label>Archived on</Label><div className="flex h-10 items-center rounded-xl border border-tal-line px-3 text-sm text-gray-400">dd/mm/yyyy</div>
        <div className="mt-1 text-xs text-tal-plum-soft">Leave blank to keep this in Current resumes. A past date moves this to &ldquo;Past resumes&rdquo;.</div>
      </Box>
      <Box x={X0 + 16} y={E.y + 308} w={CW - 32} h={320}>
        <Label>Résumé</Label>
        <div className="h-[296px] overflow-hidden whitespace-pre-line rounded-xl border border-tal-line px-3 py-2 text-[13px] leading-snug">{RESUME}</div>
      </Box>
      <SmartRow y={E.y + 634} />
      <Box x={X0 + 16} y={NOTES_Y} w={CW - 32} h={100}>
        <Label>Notes</Label>
        <div className={`h-20 rounded-xl border px-3 py-2 text-sm ${state === "rough" || state === "recording" ? "border-tal-plum" : "border-tal-line"}`}>{notes}</div>
        {state === "recording" && <div className="mt-1 text-xs italic text-tal-plum-soft"><span className="opacity-70">…</span> next tuesday they said call after 2</div>}
      </Box>
      <SmartRow y={NOTES_Y + 120} rec={state === "recording"} />
      <Box x={X0 + 16} y={E.y + E.h - 60} w={200} h={40} className="flex items-center gap-3">
        <span className="flex h-10 items-center rounded-xl bg-black px-4 text-sm font-medium text-white">Save</span>
        {state === "saved" && <span className="text-sm text-green-700">Saved.</span>}
      </Box>
      <Box x={X0} y={E.y + E.h + 18} w={CW} h={48} className="flex items-center justify-between rounded-xl border border-tal-line bg-white/70 px-4">
        <span className="font-display text-sm uppercase tracking-widest">Past resumes <span className="ml-1 font-sans normal-case tracking-normal text-tal-plum-soft">(1)</span></span>
        <span className="text-lg text-tal-plum-soft">+</span>
      </Box>
      {!saved && <Box x={X0} y={E.y + E.h + 82} w={CW} h={46} className="flex items-center rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm text-amber-900"><span>Your AI draft has been added as a new entry above. Check it, change anything you like, then press <strong>Save</strong> on that entry.</span></Box>}
      {polish !== undefined && (
        <>
          <Overlay h={ENTRY_H} />
          <Box x={216} y={polish} w={768} h={420} className="overflow-hidden rounded-2xl bg-white shadow-lg">
            <div className="border-b border-tal-line px-6 pb-3 pt-5">
              <div className="font-display text-lg">Review polish suggestion</div>
              <p className="mt-1 text-xs text-tal-plum-soft">AI suggested some changes. Compare below and choose which version to keep.</p>
              <p className="mt-2 text-[11px] italic text-tal-plum-soft">Standard terms apply. AI answers are a guide only, not personal advice. Always check important decisions with the right professional.</p>
            </div>
            <div className="grid h-[214px] grid-cols-2 divide-x divide-tal-line">
              <div className="p-5"><div className="mb-2 text-xs uppercase tracking-wider text-tal-plum-soft">Your original</div><div className="text-sm">{ROUGH}</div></div>
              <div className="bg-violet-50/40 p-5"><div className="mb-2 text-xs uppercase tracking-wider text-violet-800">AI suggestion</div><div className="text-sm">{POLISHED}</div></div>
            </div>
          </Box>
          <Box x={216} y={polish + 350} w={768} h={1} className="bg-tal-line" />
          <Box x={216 + 768 - 24 - 128 - 8 - 116} y={polish + 366} w={116} h={36} className="flex items-center justify-center rounded-xl text-sm">Keep original</Box>
          <Box x={216 + 768 - 24 - 128} y={polish + 366} w={128} h={36} className="flex items-center justify-center rounded-xl bg-violet-700 text-sm font-medium text-white">Use suggestion</Box>
        </>
      )}
    </Shell>
  )
}

// ── 4. TAL AI ────────────────────────────────────────────────────────────────

const TC = { x: X0, y: 160, w: 768, h: 584 }
const SEND = { x: TC.x + TC.w - 12 - 72, y: TC.y + TC.h - 36 - 52, w: 72, h: 40 }
const QUESTION = "What does Mia need for her first job?"
const ANSWER = `Congratulations to Mia! Before her first shift she'll usually need:

1. A tax file number — it's free from the ATO. She gives it straight to her employer on the TFN declaration; it isn't stored in the app.
2. A bank account in her name for her pay.
3. Her super choice — her employer will give her a form, or she can choose a fund.
4. Any ID or working-with-children checks the job asks for.

Keep her job details, pay slips and super together in her Organiser under Employment, so they're easy to find at tax time.`
const STARTERS = ["Help me write an email to my landlord", "What information belongs in an emergency contact record?", "Explain how the Australian financial year works", "How should I organise my tax paperwork?"]
const ANS_BOX = { x: TC.x + 20, y: TC.y + 70, w: 600, h: 290 }
const CHIPS = { x: TC.x + 20, y: ANS_BOX.y + ANS_BOX.h + 6, w: 520, h: 26 }

function TalAi({ answered }: { answered?: boolean }) {
  return (
    <Shell active="TAL AI">
      <Box x={X0} y={76} w={768} h={64} className="flex items-center gap-3 rounded-2xl bg-black px-6 text-white shadow-md">
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">TAL AI</span>
        <span className="font-display text-2xl">Ask anything</span>
        <span className="text-white/40">·</span><span className="text-sm text-white/80">Powered by ChatGPT</span>
      </Box>
      <Box x={TC.x} y={TC.y} w={TC.w} h={TC.h} className="rounded-2xl border border-tal-line bg-white" />
      {!answered ? (
        <Box x={TC.x + 60} y={TC.y + 110} w={TC.w - 120} h={260} className="flex flex-col items-center gap-4 text-center">
          <div className="max-w-md">
            <p className="mb-1 font-medium">Ask TAL AI for a hand with life admin.</p>
            <p className="text-sm text-tal-plum-soft">TAL AI gives general guidance and wording help — not legal, financial, tax or medical advice. Always check important decisions with the right professional.</p>
          </div>
          <div className="flex max-w-lg flex-wrap justify-center gap-2">
            {STARTERS.map((p) => <span key={p} className="rounded-full border border-tal-line bg-tal-cream-soft/60 px-3 py-1.5 text-xs">{p}</span>)}
          </div>
        </Box>
      ) : (
        <>
          <Box x={TC.x + TC.w - 20 - 240} y={TC.y + 20} w={240} h={44} className="flex items-center justify-center rounded-2xl bg-black px-4 text-sm text-white">{QUESTION}</Box>
          <Box {...ANS_BOX} className="whitespace-pre-wrap rounded-2xl bg-tal-cream-soft px-4 py-3 text-sm leading-snug">{ANSWER}</Box>
          <Box {...CHIPS} className="flex items-center gap-1.5 pl-1">
            <span className="text-[11px] text-tal-plum-soft">From the guide:</span>
            <span className="rounded-full border border-tal-line bg-white px-2 py-0.5 text-[11px]">Starting a new job</span>
            <span className="rounded-full border border-tal-line bg-white px-2 py-0.5 text-[11px]">Employment · Employee Information</span>
          </Box>
          <Box x={TC.x + 21} y={CHIPS.y + 30} w={600} h={16} className="text-[11px] italic text-tal-plum-soft">Standard terms apply. AI answers are a guide only, not personal advice. Always check important decisions with the right professional.</Box>
          <Box x={TC.x + 21} y={CHIPS.y + 50} w={100} h={16} className="text-[11px] text-tal-plum-soft">👎 Report</Box>
        </>
      )}
      <Box x={TC.x} y={TC.y + TC.h - 100} w={TC.w} h={1} className="bg-tal-line" />
      <Box x={TC.x + 12} y={SEND.y} w={TC.w - 24 - 80} h={40} className={`flex items-center rounded-xl border px-3 text-sm ${answered ? "border-tal-line text-gray-400" : "border-tal-plum"}`}>{answered ? "Ask something…" : QUESTION}</Box>
      <Box {...SEND} className={`flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white ${answered ? "opacity-60" : ""}`}>Send</Box>
      <Box x={TC.x} y={TC.y + TC.h - 36} w={TC.w} h={1} className="bg-tal-line" />
      <Box x={TC.x + 20} y={TC.y + TC.h - 28} w={TC.w - 40} h={20} className="text-[11px] italic text-tal-plum-soft">Standard terms apply. AI answers are a guide only, not personal advice. Always check important decisions with the right professional.</Box>
    </Shell>
  )
}

// ── Steps ────────────────────────────────────────────────────────────────────

const NS = 520 // scroll that brings the Notes box and Save into view
const SCREENS: Record<string, ReactNode> = {
  folder: <ResumeFolder />,
  coach1: <Coach stage={1} />,
  coach2: <Coach stage={2} />,
  coach3: <Coach stage={3} />,
  draft: <ResumeEntry state="draft" />,
  saved: <ResumeEntry state="saved" />,
  talai: <TalAi />,
  answer: <TalAi answered />,
  recording: <ResumeEntry state="recording" />,
  rough: <ResumeEntry state="rough" />,
  polish: <ResumeEntry state="rough" polish={NS + 150} />,
}

const U = "app.theadultinglife.com.au"
const FOLDER_URL = `${U}/records/employment/employment.resume`
const footTop3 = CD.y + CD.h - 150
const STEPS: WalkStep[] = [
  { screen: "folder", caption: "Résumé? Let AI help", detail: "Sarah wants a practice manager job. Her Resume folder has a \"Write my résumé with AI\" button.",
    url: FOLDER_URL, focus: { x: 900, y: 220, scale: 1.6 }, ring: COACH_BTN, click: { x: COACH_BTN.x + 124, y: COACH_BTN.y + 20 }, duration: 6500 },
  { screen: "coach1", caption: "Answer in your own words", detail: "It asks one question at a time. Nothing is saved until you add the draft.",
    url: FOLDER_URL, focus: { x: 600, y: 520, scale: 1.3 }, ring: { x: CD.x + 20, y: CD.y + CD.h - 88, w: CD.w - 136, h: 56 }, click: { x: CD.x + CD.w - 64, y: CD.y + CD.h - 68 }, duration: 7000 },
  { screen: "coach2", caption: "A few quick questions", detail: "Jobs, what she did there, qualifications and skills - then \"Draft it now\".",
    url: FOLDER_URL, focus: { x: 600, y: 420, scale: 1.15 }, ring: { x: CD.x + CD.w - 108, y: CD.y + CD.h - 42, w: 88, h: 30 }, click: { x: CD.x + CD.w - 64, y: CD.y + CD.h - 27 }, duration: 8000 },
  { screen: "coach3", caption: "A draft in seconds", detail: "Australian style, using only what she told it - no made-up jobs or skills.",
    url: FOLDER_URL, focus: { x: 600, y: 420, scale: 1.25 }, ring: { x: CD.x + 20, y: 200, w: CD.w - 40, h: 350 }, duration: 7500 },
  { screen: "coach3", caption: "Add to my form", url: FOLDER_URL,
    focus: { x: 800, y: 620, scale: 1.5 }, ring: { x: CD.x + CD.w - 160, y: footTop3 + 10, w: 140, h: 40 }, click: { x: CD.x + CD.w - 90, y: footTop3 + 30 }, duration: 4500 },
  { screen: "draft", caption: "Review it - change anything", detail: "The draft lands as a new entry, marked \"Not saved yet\".",
    url: FOLDER_URL, focus: { x: 728, y: 480, scale: 1.2 }, ring: { x: X0, y: E.y, w: CW, h: 460 }, duration: 7000 },
  { screen: "draft", caption: "Save", url: FOLDER_URL, scroll: NS,
    focus: { x: 500, y: E.y + E.h - 40, scale: 1.4 }, ring: { x: X0 + 16, y: E.y + E.h - 60, w: 72, h: 40 }, click: { x: X0 + 52, y: E.y + E.h - 40 }, duration: 4500 },
  { screen: "saved", caption: "Download, print or email it as a PDF", detail: "Ready to send with her applications.",
    url: FOLDER_URL, focus: { x: 950, y: 320, scale: 1.5 }, ring: { x: X0 + CW - 304, y: E.y + 6, w: 248, h: 44 }, duration: 6000 },
  { screen: "talai", caption: "TAL AI - ask any adulting question", detail: "Mia is starting her first job. Sarah asks what she needs.",
    url: `${U}/tal-ai`, focus: { x: 672, y: 560, scale: 1.25 }, ring: { x: TC.x + 12, y: SEND.y, w: TC.w - 24, h: 40 }, click: { x: SEND.x + 36, y: SEND.y + 20 }, duration: 6500 },
  { screen: "answer", caption: "Plain-English steps", detail: "General guidance in plain English - not personal advice.",
    url: `${U}/tal-ai`, focus: { x: 620, y: 380, scale: 1.3 }, ring: ANS_BOX, duration: 8000 },
  { screen: "answer", caption: "It points you into the app", detail: "Where to keep her job details in the Organiser, with links to the guide.",
    url: `${U}/tal-ai`, focus: { x: 560, y: 460, scale: 1.6 }, ring: { x: ANS_BOX.x, y: ANS_BOX.y + ANS_BOX.h - 72, w: ANS_BOX.w, h: 104 }, duration: 6500 },
  { screen: "recording", caption: "Talk instead of typing", detail: "Tap Dictate on any notes box and just say it.",
    url: FOLDER_URL, scroll: NS, focus: { x: 600, y: NOTES_Y + 70, scale: 1.45 }, ring: { x: X0 + 16, y: NOTES_Y + 120, w: 66, h: 32 }, duration: 6500 },
  { screen: "rough", caption: "Polish tidies your wording", detail: "Spelling, capitals and punctuation - one tap.",
    url: FOLDER_URL, scroll: NS, focus: { x: 600, y: NOTES_Y + 70, scale: 1.45 }, ring: { x: X0 + 16 + 122, y: NOTES_Y + 120, w: 84, h: 32 }, click: { x: X0 + 16 + 164, y: NOTES_Y + 136 }, duration: 6000 },
  { screen: "polish", caption: "You choose which version to keep", detail: "Compare side by side - nothing changes until you say so.",
    url: FOLDER_URL, scroll: NS, focus: { x: 600, y: NS + 360, scale: 1.15 }, ring: { x: 216 + 768 - 152, y: NS + 150 + 366, w: 128, h: 36 }, click: { x: 216 + 768 - 88, y: NS + 150 + 384 }, duration: 7000 },
]

export default function AiHelpersWalkthrough({ autoStart = false }: { autoStart?: boolean }) {
  return (
    <WalkthroughPlayer music="/audio/prestart-music.mp3" steps={STEPS} screens={SCREENS} title="AI writing helpers" autoStart={autoStart} url={FOLDER_URL}
      intro={{ title: "Your AI writing helpers", subtitle: "Write a résumé with AI, ask TAL AI anything, talk instead of typing - and tidy your wording." }} />
  )
}
