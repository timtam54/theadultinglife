"use client"

// "Fill in a document from a photo" walkthrough (phone) for the public /demo
// page: hand-built copies of the real screens with a made-up family's sample
// data (Sarah Taylor, Brisbane) - no sign-in, no API calls, and the passport is
// drawn in HTML and marked SAMPLE. Personal matrix (components/CategoryMatrix,
// mobile layout) -> Passport folder (records/[category]/[subcategory] +
// components/PageForm, passport questions from migrations 008/166) -> "Upload &
// scan a file" (components/FileFieldInput) -> camera -> "AI will read this
// document" (components/AiConsentGate) -> fields filled -> Save -> the expiry
// date (a reminder date) shows in Reminders (app/(app)/reminders) and on the
// dashboard. Canvas 390 x 844 (see WalkthroughPlayer); the passport form scrolls.
// If one of those pages changes, update the matching screen here.

import type { CSSProperties, ReactNode } from "react"
import { motion } from "framer-motion"
import WalkthroughPlayer, { type WalkStep } from "./WalkthroughPlayer"

const W = 390
const Box = ({ x, y, w, h, children, className = "", style }: { x: number; y: number; w: number; h: number; children?: ReactNode; className?: string; style?: CSSProperties }) => (
  <div className={`absolute ${className}`} style={{ left: x, top: y, width: w, height: h, ...style }}>{children}</div>
)
const Img = ({ src, x, y, size, className = "rounded-xl" }: { src: string; x: number; y: number; size: number; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className={`absolute bg-white object-cover ${className}`} style={{ left: x, top: y, width: size, height: size }} />
)
const Phone = ({ children, h = 844 }: { children: ReactNode; h?: number }) => (
  <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>{children}</div>
)
const StatusBar = ({ light }: { light?: boolean }) => (
  <Box x={0} y={0} w={W} h={44} className={`flex items-center justify-between px-7 text-sm font-semibold ${light ? "text-white" : "text-tal-plum-dark"}`}><span>9:41</span><span className="tracking-widest">▂▄▆ ◔ ▭</span></Box>
)
// Mobile header from app/(app)/layout.tsx: logo, Ask TAL AI, reminders bell, avatar, menu.
function MobileHeader({ badge }: { badge?: number }) {
  return (
    <>
      <StatusBar />
      <Box x={0} y={44} w={W} h={64} className="border-b border-tal-line bg-tal-cream-soft/95" />
      <Img src="/icons-pwa/icon-192.png" x={14} y={58} size={36} />
      <Box x={144} y={60} w={96} h={36} className="flex items-center justify-center rounded-full bg-black text-xs font-medium text-white">✺ Ask TAL AI</Box>
      <Box x={244} y={58} w={40} h={40} className="flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 0 1 12 0v5l1.5 2.5H4.5L6 14V9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        {badge ? <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">{badge}</span> : null}
      </Box>
      <Box x={288} y={58} w={52} h={40} className="flex items-center gap-1"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-tal-cream text-sm font-medium">S</span><span className="text-xs text-tal-plum-soft">▾</span></Box>
      <Box x={342} y={58} w={40} h={40} className="flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </Box>
    </>
  )
}
const Spinner = () => <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

// ── 1. Personal matrix, phone layout (CategoryMatrix -> MobileMatrix) ────────

type Cell = "done" | "started" | "empty" | "na"
const CELL: Record<Cell, { s: string; c: string; bg: string }> = {
  done: { s: "✓", c: "text-green-700 font-bold", bg: "bg-green-50" },
  started: { s: "◐", c: "text-amber-700 font-bold", bg: "bg-amber-50" },
  empty: { s: "✗", c: "text-red-700 font-bold", bg: "bg-red-50" },
  na: { s: "—", c: "text-tal-plum-soft", bg: "" },
}
const ROWS: { name: string; thumb: string; cells: Cell[] }[] = [
  { name: "Emergency Contacts", thumb: "emergency_contacts", cells: ["done", "done", "started", "started"] },
  { name: "Birth Certificates", thumb: "birth_certificates", cells: ["done", "done", "done", "done"] },
  { name: "Passport & Travel Documents", thumb: "passport_travel", cells: ["empty", "done", "empty", "empty"] },
  { name: "Travel Documents", thumb: "passport_travel", cells: ["empty", "empty", "empty", "empty"] },
  { name: "Driver's Licence", thumb: "drivers_licence", cells: ["done", "done", "na", "na"] },
]
const cellX = (u: number) => 20 + u * 87.5
const mRowY = (n: number) => 476 + n * 72
function MobileMatrix() {
  return (
    <Phone>
      <MobileHeader />
      <Box x={10} y={118} w={370} h={20} className="text-sm text-tal-plum-soft">The Adulting Life Organiser <span className="opacity-50">/</span> Personal</Box>
      <Box x={8} y={146} w={374} h={100} className="rounded-2xl bg-black px-4 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/thumbnails/categories/personal.png" alt="" className="h-9 w-9 rounded-xl object-cover" />
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">The Adulting Life Organiser</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-display text-2xl">Personal</span>
          <span className="inline-flex gap-1 rounded-full border-2 border-white/60 bg-white/10 p-1 text-xs"><span className="px-2 py-1 text-white/85">List</span><span className="px-2 py-1 text-white/85">Grid</span><span className="rounded-full bg-white px-2 py-1 font-medium text-black">Matrix</span></span>
        </div>
      </Box>
      <Box x={10} y={258} w={370} h={34} className="text-[11px] leading-snug text-tal-plum-soft">
        <b className="text-green-700">✓</b> complete · <b className="text-amber-700">◐</b> in progress · <b className="text-red-700">✗</b> empty · — not applicable<br />
        <span className="font-medium text-tal-plum">22 folders in this section</span> · scroll for more
      </Box>
      <Box x={8} y={300} w={374} h={560} className="overflow-hidden rounded-2xl border border-tal-line bg-white" />
      <Box x={9} y={301} w={372} h={170} className="rounded-t-2xl border-b border-tal-line bg-tal-cream-soft" />
      {["Sarah Taylor ★", "James Taylor", "Mia Taylor", "Leo Taylor"].map((n, u) => (
        <Box key={n} x={cellX(u)} y={312} w={86} h={150} className="flex items-end justify-center">
          <span className="text-xs font-medium leading-none" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{n}</span>
        </Box>
      ))}
      {ROWS.map((r, n) => (
        <div key={r.name}>
          {n > 0 && <Box x={9} y={mRowY(n) - 4} w={372} h={1} className="bg-tal-line" />}
          <Box x={18} y={mRowY(n)} w={350} h={26} className="flex items-center gap-2 text-sm">
            <span className="text-xs tabular-nums text-tal-plum-soft">{n + 2}.</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/thumbnails/subcategories/personal.${r.thumb}.png`} alt="" className="h-6 w-6 rounded-md bg-white object-cover ring-1 ring-tal-line" />
            {r.name}
          </Box>
          {r.cells.map((c, u) => (
            <Box key={u} x={cellX(u)} y={mRowY(n) + 32} w={86} h={30} className={`flex items-center justify-center rounded-md ${CELL[c].bg}`}><span className={CELL[c].c}>{CELL[c].s}</span></Box>
          ))}
        </div>
      ))}
    </Phone>
  )
}

// ── 2. Sarah's Passport folder (PageForm, passport questions) ────────────────

type FormState = "empty" | "reading" | "filled" | "saved"
const PP_H = 2010
const BANNER = 112 // the "required fields still empty" box goes once they're filled
const QS: [string, string, boolean][] = [
  ["Type", "P (Passport)", true], ["Code of issuing State", "AUS", true], ["Document No.", "PA1234567", true],
  ["Family name / Surname", "TAYLOR", true], ["Given names", "SARAH JANE", true], ["Nationality", "AUSTRALIAN", true],
  ["Date of birth", "14/05/1988", true], ["Sex", "F", true], ["Place of birth", "BRISBANE", true],
  ["Date of issue", "09/12/2016", true], ["Date of expiry", "09/12/2026", true], ["Authority", "AUSTRALIA", false],
]
const EXPIRY = 10
const qY = (i: number, filled: boolean) => 954 + i * 78 + (i > EXPIRY ? 36 : 0) - (filled ? BANNER : 0)
const saveY = (filled: boolean) => qY(QS.length - 1, filled) + 90
function Passport({ state }: { state: FormState }) {
  const filled = state === "filled" || state === "saved"
  const off = filled ? -BANNER : 0
  return (
    <Phone h={PP_H}>
      <MobileHeader />
      <Box x={10} y={118} w={370} h={20} className="text-sm text-tal-plum-soft">The Adulting Life Organiser <span className="opacity-50">·</span> Personal <span className="opacity-50">·</span></Box>
      <Box x={10} y={144} w={150} h={36} className="flex items-center gap-2 rounded-full border-2 border-tal-plum/40 bg-white pl-2 pr-3 text-sm font-semibold shadow-sm">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-tal-plum/10 text-xs">👤</span>Sarah Taylor<span className="text-xs">▾</span>
      </Box>
      <Box x={8} y={192} w={374} h={120} className="rounded-2xl bg-black shadow-md" />
      <Img src="/thumbnails/subcategories/personal.passport_travel.png" x={22} y={204} size={48} className="rounded-xl ring-2 ring-white/20" />
      <Box x={86} y={214} w={280} h={30} className="font-display text-xl text-white">Passport &amp; Travel Documents</Box>
      <Box x={22} y={264} w={130} h={36} className="flex items-center justify-center rounded-xl bg-white text-sm font-medium">Export to Excel</Box>
      <Box x={8} y={328} w={374} h={100} className="flex gap-3 rounded-2xl border border-tal-line bg-tal-cream-soft/60 p-4 text-sm leading-relaxed">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tal-plum/10">i</span>
        Your passport details, one entry per current + past passport. Attach a scan for easy reference and to speed up applications.
      </Box>
      <Box x={8} y={444} w={374} h={36} className="flex justify-end gap-2 text-sm">
        {["Share", "Preview", "⤓ PDF", "✉ PDF"].map((b) => <span key={b} className="flex items-center rounded-xl border border-tal-line bg-white px-3">{b}</span>)}
      </Box>
      {!filled && (
        <Box x={8} y={496} w={374} h={96} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">⚠ 11 required fields still empty</p>
          <p className="mt-0.5 text-xs text-amber-800">You can save now and finish later, but this folder won&apos;t show as complete until every required field is filled.</p>
        </Box>
      )}
      <Box x={8} y={606 + off} w={374} h={16} className="text-xs uppercase tracking-wider text-tal-plum-soft">Passport document</Box>
      {filled ? (
        <>
          <Box x={8} y={624 + off} w={374} h={90} className="rounded-xl border border-tal-line bg-white px-3 py-2">
            <p className="text-sm">📄 <u>passport-photo-page.jpg</u></p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-medium">
              {["View", "Download", "Share", "Replace"].map((b) => <span key={b} className="rounded-lg border border-tal-line px-2.5 py-1.5">{b}</span>)}
              <span className="rounded-lg border border-red-200 px-2.5 py-1.5 text-red-700">Remove</span>
              <span className="px-1 py-1.5 font-normal">Rescan</span>
            </div>
          </Box>
          <Box x={8} y={720 + off} w={374} h={64} className="text-xs leading-snug text-tal-plum-soft">Scanned — Filled Type, Code of issuing State, Document No., Family name / Surname, Given names, Nationality, Date of birth, Sex, Place of birth, Date of issue, Date of expiry, Authority.</Box>
        </>
      ) : (
        <>
          <Box x={8} y={624} w={230} h={44} className="flex items-center justify-center gap-2 rounded-xl bg-black text-sm font-medium text-white shadow-sm">
            {state === "reading" ? <><Spinner />Extracting fields with AI…</> : <>⌗ Upload &amp; scan a file</>}
          </Box>
          {state === "empty" && (
            <Box x={8} y={676} w={180} h={36} className="flex items-center justify-center gap-1.5 rounded-xl border border-tal-line bg-white text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-tal-cream text-xs font-semibold">?</span>How does this work?</Box>
          )}
          <Box x={8} y={720} w={374} h={32} className="text-xs text-tal-plum-soft">Upload a scan or photo of the passport data page (PDF or image).</Box>
          {state === "empty" && <Box x={8} y={752} w={374} h={32} className="text-xs text-tal-plum-soft">Scan only fills empty fields — clear a field first if you want the scan to overwrite it.</Box>}
        </>
      )}
      <Box x={8} y={800 + off} w={374} h={16} className="text-xs uppercase tracking-wider text-tal-plum-soft">Portrait photo</Box>
      <Box x={8} y={818 + off} w={96} h={120} className="flex items-center justify-center overflow-hidden rounded-xl border border-tal-line bg-white text-xs text-tal-plum-soft">
        {filled ? <Portrait /> : "+ Photo"}
      </Box>
      {QS.map(([label, value, req], i) => (
        <div key={label}>
          <Box x={8} y={qY(i, filled)} w={374} h={16} className="text-xs uppercase tracking-wider text-tal-plum-soft">{label}{req && <span className="text-red-500">*</span>}</Box>
          <Box x={8} y={qY(i, filled) + 18} w={374} h={44} className="flex items-center rounded-xl border border-tal-line bg-white px-3 text-sm">
            {filled && (
              <motion.span initial={state === "filled" ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.12 }}>{value}</motion.span>
            )}
          </Box>
          {i === EXPIRY && (
            <Box x={8} y={qY(i, filled) + 66} w={374} h={32} className="text-xs text-tal-plum-soft">Added to your Reminders automatically — from 30 days before, and once it has passed.</Box>
          )}
        </div>
      ))}
      {state === "reading" && (
        <motion.div className="pointer-events-none absolute left-0 h-2 w-full bg-tal-forest/60 shadow-[0_0_18px_6px_rgba(47,92,92,0.35)]"
          initial={{ top: 620 }} animate={{ top: [620, 1500, 620] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
      )}
      <Box x={8} y={saveY(filled)} w={80} h={44} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Save</Box>
      {state === "saved" && <Box x={100} y={saveY(filled) + 12} w={100} h={20} className="text-sm text-green-700">Saved.</Box>}
    </Phone>
  )
}
const Portrait = () => (
  <svg viewBox="0 0 60 75" className="h-full w-full bg-slate-200"><circle cx="30" cy="28" r="13" fill="#94a3b8" /><path d="M6 75c2-16 12-24 24-24s22 8 24 24Z" fill="#94a3b8" /></svg>
)

// ── 3. Take the photo ────────────────────────────────────────────────────────

function PhotoSheet() {
  return (
    <>
      <Passport state="empty" />
      <div className="absolute inset-0 bg-black/40" style={{ height: 844 }} />
      <Box x={8} y={600} w={374} h={172} className="divide-y divide-gray-300/70 overflow-hidden rounded-2xl bg-white/95 text-center text-[17px] text-blue-600 backdrop-blur">
        {["Photo Library", "Take Photo", "Choose File"].map((t) => <div key={t} className="flex h-[57px] items-center justify-center">{t}</div>)}
      </Box>
      <Box x={8} y={780} w={374} h={56} className="flex items-center justify-center rounded-2xl bg-white text-[17px] font-semibold text-blue-600">Cancel</Box>
    </>
  )
}
// A made-up passport photo page, drawn in HTML and stamped SAMPLE.
function SamplePassport() {
  const rows: [string, string][] = [["Type / Code / No.", "P   AUS   PA1234567"], ["Surname", "TAYLOR"], ["Given names", "SARAH JANE"], ["Nationality", "AUSTRALIAN"], ["Date of birth / Sex", "14 MAY 1988   F"], ["Place of birth", "BRISBANE"], ["Date of issue", "09 DEC 2016"], ["Date of expiry", "09 DEC 2026"]]
  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-gradient-to-br from-[#e9efe4] via-[#f3eedf] to-[#e3ead9] p-3 font-mono text-[9px] text-slate-800 shadow-2xl">
      <p className="mb-2 text-[10px] font-bold tracking-widest">PASSPORT · SAMPLE DOCUMENT</p>
      <div className="flex gap-3">
        <div className="h-[104px] w-[80px] shrink-0 overflow-hidden rounded"><Portrait /></div>
        <div className="grid flex-1 gap-[3px]">
          {rows.map(([k, v]) => <div key={k}><p className="text-[6.5px] uppercase text-slate-500">{k}</p><p className="font-bold leading-none">{v}</p></div>)}
        </div>
      </div>
      <p className="mt-2 truncate text-[8px] tracking-wider">P&lt;AUSTAYLOR&lt;&lt;SARAH&lt;JANE&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;SAMPLE&lt;&lt;&lt;</p>
      <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] text-5xl font-black tracking-widest text-red-600/30">SAMPLE</p>
    </div>
  )
}
function Camera() {
  return (
    <div className="absolute inset-0 bg-black text-white">
      <StatusBar light />
      <Box x={0} y={60} w={W} h={30} className="text-center text-xs font-semibold tracking-widest text-amber-300">PHOTO</Box>
      <Box x={0} y={110} w={W} h={560} className="bg-gradient-to-b from-stone-700 to-stone-900" />
      <motion.div className="absolute" style={{ left: 35, top: 250, width: 320, height: 230 }} initial={{ rotate: -4, scale: 0.94 }} animate={{ rotate: -1, scale: 1 }} transition={{ duration: 2 }}>
        <SamplePassport />
      </motion.div>
      {[[24, 220], [342, 220], [24, 486], [342, 486]].map(([x, y], n) => (
        <Box key={n} x={x} y={y} w={24} h={24} className={`border-amber-300 ${n === 0 ? "border-l-4 border-t-4" : n === 1 ? "border-r-4 border-t-4" : n === 2 ? "border-b-4 border-l-4" : "border-b-4 border-r-4"}`} />
      ))}
      <Box x={0} y={530} w={W} h={20} className="text-center text-xs text-white/80">Fit the photo page inside the frame</Box>
      <Box x={160} y={710} w={70} h={70} className="rounded-full border-4 border-white p-1"><div className="h-full w-full rounded-full bg-white" /></Box>
      <Box x={30} y={732} w={60} h={26} className="text-sm">Cancel</Box>
    </div>
  )
}

// ── 4. "AI will read this document" (AiConsentGate) ──────────────────────────

const CX = 16, CY = 280, CW = 358
function Consent() {
  return (
    <>
      <Passport state="empty" />
      <div className="absolute inset-0 bg-black/40" style={{ height: 844 }} />
      <Box x={CX} y={CY} w={CW} h={278} className="rounded-2xl bg-white p-6 shadow-lg">
        <p className="mb-2 font-display text-lg">AI will read this document</p>
        <p className="mb-4 text-sm text-tal-plum-soft">The photo or PDF you upload will be sent to OpenAI so it can pull out fields like name, number and expiry date. It isn&apos;t used to train their models. You can always type the details in by hand instead.</p>
        <p className="flex items-center gap-2 text-xs text-tal-plum-soft"><span className="h-4 w-4 rounded border border-tal-line" />Don&apos;t ask me again on this device</p>
      </Box>
      <Box x={CX + CW - 24 - 146 - 80} y={CY + 218} w={72} h={36} className="flex items-center justify-center rounded-xl text-sm">Cancel</Box>
      <Box x={CX + CW - 24 - 146} y={CY + 218} w={146} h={36} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Continue with AI</Box>
    </>
  )
}

// ── 5. Reminders + dashboard ─────────────────────────────────────────────────

const REM = [
  { t: "Sarah Taylor — Passport · Date of expiry", d: "Due in 22 days · 9 Dec 2026", s: "Soon", img: "subcategories/personal.passport_travel", fresh: true },
  { t: "James Taylor — Driver's Licence · Expir…", d: "Due in 41 days · 28 Dec 2026", s: "Upcoming", img: "subcategories/personal.drivers_licence" },
  { t: "James Taylor — Vehicle Insurance · Rene…", d: "Due in 54 days · 10 Jan 2027", s: "Upcoming", img: "subcategories/admin.vehicle_insurance" },
]
function Reminders() {
  return (
    <Phone>
      <MobileHeader badge={3} />
      <Box x={8} y={124} w={374} h={128} className="rounded-2xl bg-black px-5 py-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/thumbnails/dashboard/expiring-soon.png" alt="" className="h-9 w-9 rounded-xl object-cover" />
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">Reminders</span>
          <span className="font-display text-xl leading-tight">What&apos;s coming up</span>
        </div>
        <div className="mt-3 flex items-center justify-between"><span className="text-sm text-white/80">3 upcoming</span><span className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-tal-plum">+ Add reminder</span></div>
      </Box>
      <Box x={10} y={272} w={370} h={28} className="font-display text-xl">Upcoming</Box>
      {REM.map((r, n) => (
        <motion.div key={r.t} className={`absolute flex items-center gap-3 rounded-xl border bg-white p-4 ${r.fresh ? "border-amber-300" : "border-tal-line"}`}
          style={{ left: 8, top: 310 + n * 86, width: 374, height: 76 }}
          initial={r.fresh ? { opacity: 0, y: -12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/thumbnails/${r.img}.png`} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-white object-cover ring-1 ring-tal-line" />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{r.t}</p><p className="mt-0.5 text-xs text-tal-plum-soft">{r.d}</p></div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${r.s === "Soon" ? "bg-amber-100 text-amber-900" : "bg-tal-cream-soft text-tal-plum-soft"}`}>{r.s}</span>
        </motion.div>
      ))}
    </Phone>
  )
}
const DASH_H = 1100
function Dashboard() {
  return (
    <Phone h={DASH_H}>
      <MobileHeader badge={3} />
      <Box x={10} y={124} w={370} h={34} className="font-display text-2xl">Hi Sarah.</Box>
      <Box x={10} y={160} w={370} h={44} className="text-tal-plum-soft">3 reminders are coming up and 4 tasks are waiting.</Box>
      <Box x={8} y={218} w={374} h={104} className="flex items-start gap-3 rounded-2xl bg-red-600 p-4 text-white shadow-md">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">⚠</span>
        <div><p className="text-[10px] font-medium uppercase tracking-widest text-white/80">In case of emergency</p><p className="font-medium">Your emergency information</p><p className="mt-1 text-xs text-white/85">Contacts, medications, insurance and will, on one page ready when it&apos;s needed.</p></div>
      </Box>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/thumbnails/banners/dashboard.jpg" alt="" className="absolute rounded-2xl border border-tal-line object-cover" style={{ left: 8, top: 338, width: 374, height: 94 }} />
      <Box x={8} y={464} w={374} h={96} className="flex flex-col justify-center rounded-2xl bg-tal-cream p-5">
        <p className="text-sm font-medium">✨ You&apos;re doing great!</p>
        <p className="mb-2 text-xs text-tal-plum-soft">You&apos;ve completed 31% of your Organiser</p>
        <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white"><div className="h-full bg-violet-500" style={{ width: "31%" }} /></div><span className="text-xs font-medium">31%</span></div>
      </Box>
      {[
        { l: "Records & Documents", s: "Stored securely", v: 24, bg: "bg-violet-50 ring-violet-100", img: "records-documents" },
        { l: "Things expiring soon", s: "View reminders", v: 3, bg: "bg-amber-50 ring-amber-100", img: "expiring-soon" },
        { l: "Tasks to complete", s: "Keep it up!", v: 4, bg: "bg-sky-50 ring-sky-100", img: "tasks" },
        { l: "All good", s: "No overdue items", v: 21, bg: "bg-emerald-50 ring-emerald-100", img: "all-good" },
      ].map((c, n) => (
        <Box key={c.l} x={8} y={592 + n * 96} w={374} h={80} className={`flex items-center gap-3 rounded-2xl p-4 ring-1 ${c.bg}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/thumbnails/dashboard/${c.img}.png`} alt="" className="h-12 w-12 shrink-0 rounded-2xl bg-white object-cover ring-1 ring-white" />
          <div className="min-w-0 flex-1"><p className="font-medium leading-tight">{c.l}</p><p className="mt-0.5 text-xs text-tal-plum-soft">{c.s}</p></div>
          <div className="flex flex-col items-end"><span className="font-display text-2xl leading-none">{c.v}</span><span className="mt-1 text-xs text-tal-plum-soft">→</span></div>
        </Box>
      ))}
    </Phone>
  )
}

const SCREENS: Record<string, ReactNode> = {
  matrix: <MobileMatrix />,
  pp: <Passport state="empty" />,
  sheet: <PhotoSheet />,
  camera: <Camera />,
  consent: <Consent />,
  reading: <Passport state="reading" />,
  filled: <Passport state="filled" />,
  saved: <Passport state="saved" />,
  reminders: <Reminders />,
  dash: <Dashboard />,
}

const passportRow = 2
const expY = qY(EXPIRY, true)
const STEPS: WalkStep[] = [
  { screen: "matrix", caption: "Open your Passport folder", detail: "Organiser → Personal. Sarah's passport square is still red - nothing in it yet.",
    focus: { x: 195, y: 560, scale: 1.3 }, ring: { x: cellX(0), y: mRowY(passportRow) + 32, w: 86, h: 30 }, click: { x: cellX(0) + 43, y: mRowY(passportRow) + 47 }, duration: 6500 },
  { screen: "pp", caption: "Sarah's Passport", detail: "Eleven details to fill in - or let the app read them from a photo.",
    focus: { x: 195, y: 470, scale: 1.1 }, ring: { x: 8, y: 496, w: 374, h: 96 }, duration: 6000 },
  { screen: "pp", caption: "Upload & scan a file", detail: "Use a photo or a PDF you already have.", scroll: 300,
    focus: { x: 195, y: 680, scale: 1.3 }, ring: { x: 8, y: 624, w: 230, h: 44 }, click: { x: 123, y: 646 }, duration: 5500 },
  { screen: "sheet", caption: "Take a photo", focus: { x: 195, y: 690, scale: 1.25 }, ring: { x: 8, y: 657, w: 374, h: 57 }, click: { x: 195, y: 686 }, duration: 4500 },
  { screen: "camera", caption: "Snap the photo page", detail: "This is a made-up sample passport - never a real one.",
    focus: { x: 195, y: 420, scale: 1.1 }, ring: { x: 160, y: 710, w: 70, h: 70 }, click: { x: 195, y: 745 }, duration: 6500 },
  { screen: "consent", caption: "AI reads it - only with your OK", detail: "It pulls out the name, number and dates. You can always type them in by hand instead.",
    focus: { x: 195, y: 420, scale: 1.15 }, ring: { x: CX + CW - 170, y: CY + 218, w: 146, h: 36 }, click: { x: CX + CW - 97, y: CY + 236 }, duration: 7000 },
  { screen: "reading", caption: "Reading your passport…", detail: "\"Extracting fields with AI…\" - a few seconds.", scroll: 300,
    focus: { x: 195, y: 700, scale: 1.2 }, duration: 5000 },
  { screen: "filled", caption: "The form fills itself in", detail: "Document number, name, nationality, birth date - check them over. It only fills empty fields.", scroll: 560,
    focus: { x: 195, y: 1060, scale: 1.05 }, duration: 8000 },
  { screen: "filled", caption: "The expiry date becomes a reminder", detail: "\"Added to your Reminders automatically — from 30 days before, and once it has passed.\"", scroll: 940,
    focus: { x: 195, y: expY + 40, scale: 1.3 }, ring: { x: 8, y: expY - 4, w: 374, h: 102 }, duration: 7500 },
  { screen: "filled", caption: "Save", scroll: PP_H - 844, focus: { x: 195, y: saveY(true) - 40, scale: 1.3 }, ring: { x: 8, y: saveY(true), w: 80, h: 44 }, click: { x: 48, y: saveY(true) + 22 }, duration: 4500 },
  { screen: "saved", caption: "Saved", detail: "And the photo is kept in the folder too, so it's there when you need it.", scroll: PP_H - 844,
    focus: { x: 195, y: saveY(true) - 40, scale: 1.3 }, ring: { x: 8, y: saveY(true), w: 200, h: 44 }, duration: 4500 },
  { screen: "reminders", caption: "We'll remind you before it expires", detail: "Sarah's passport is due in 22 days - time to renew. It stays here until it's sorted.",
    focus: { x: 195, y: 380, scale: 1.2 }, ring: { x: 8, y: 310, w: 374, h: 76 }, duration: 7500 },
  { screen: "dash", caption: "And it's on your dashboard", detail: "The bell shows it, and \"Things expiring soon\" counts it.",
    focus: { x: 195, y: 300, scale: 1.1 }, ring: { x: 8, y: 154, w: 374, h: 50 }, duration: 6000 },
  { screen: "dash", caption: "Nothing slips through", detail: "Every expiry date you save - passports, licences, insurance, cards - lands here by itself.", scroll: 256,
    focus: { x: 195, y: 720, scale: 1.15 }, ring: { x: 8, y: 688, w: 374, h: 80 }, duration: 6500 },
]

export default function DocumentScanWalkthrough({ autoStart = false }: { autoStart?: boolean }) {
  return (
    <WalkthroughPlayer device="phone" steps={STEPS} screens={SCREENS} title="Fill in a document from a photo" autoStart={autoStart}
      intro={{ title: "Fill it in from a photo", subtitle: "Photograph your passport and the details fill themselves in - with a reminder before it expires." }} />
  )
}
