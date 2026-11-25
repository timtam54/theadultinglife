"use client"

// "Staying on top of things" walkthrough (phone) for the public /demo page:
// hand-built copies of the real screens with the Taylor family's sample data -
// no sign-in, no API calls. Reminders (app/(app)/reminders, CustomReminderRow)
// -> Add a reminder -> Custom reminder (CustomReminderForm) -> the push
// notifications the nightly cron sends (api/cron/send-nudges) -> Tasks
// (TasksList) -> Emergency -> Learn (hub, article, QuizRunner, StreakCard).
// "Today" is Tue 17 Nov 2026. Canvas 390 x 844 (see WalkthroughPlayer); the
// Learn hub scrolls. If a real screen changes, update the matching screen here.

import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, Bell, Calendar, Clock, Download, Folder, Menu, Plus, Send, Sparkles } from "lucide-react"
import WalkthroughPlayer, { type WalkStep } from "./WalkthroughPlayer"

const W = 390
const Box = ({ x, y, w, h, children, className = "", style }: { x: number; y: number; w: number; h: number; children?: ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`absolute ${className}`} style={{ left: x, top: y, width: w, height: h, ...style }}>{children}</div>
)

const StatusBar = ({ dark, time = "9:41" }: { dark?: boolean; time?: string }) => (
  <Box x={0} y={0} w={W} h={44} className={`flex items-center justify-between px-7 text-sm font-semibold ${dark ? "text-white" : "bg-tal-cream-soft text-tal-plum"}`}><span>{time}</span><span className="tracking-widest">▂▄▆ ◔ ▭</span></Box>
)
/** The phone header from app/(app)/layout.tsx: logo, TAL AI, reminders bell, avatar, menu. */
const AppHeader = ({ bell = 6 }: { bell?: number }) => (
  <Box x={0} y={44} w={W} h={64} className="flex items-center gap-1 border-b border-tal-line bg-tal-cream-soft px-4">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/icons-pwa/icon-192.png" alt="" className="h-9 w-9 rounded-xl" />
    <div className="flex-1" />
    <span className="flex h-9 items-center gap-1.5 rounded-full bg-black px-2.5 text-xs font-medium text-white"><Sparkles className="h-3.5 w-3.5" />TAL AI</span>
    <span className="relative flex h-10 w-10 items-center justify-center text-tal-plum"><Bell className="h-5 w-5" /><span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">{bell}</span></span>
    <span className="flex items-center gap-1 pr-1"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">S</span><span className="text-xs text-tal-plum-soft">▾</span></span>
    <span className="flex h-10 w-10 items-center justify-center text-tal-plum"><Menu className="h-5 w-5" /></span>
  </Box>
)
const Phone = ({ children, h = 844, bell }: { children: ReactNode; h?: number; bell?: number }) => (
  <div className="absolute left-0 top-0 w-full bg-tal-cream-soft font-sans text-tal-plum" style={{ height: h }}>
    {children}
    <StatusBar /><AppHeader bell={bell} />
  </div>
)
const Crumbs = ({ items }: { items: string[] }) => (
  <Box x={8} y={116} w={374} h={20} className="flex items-center gap-2 text-sm text-tal-plum-soft">
    {items.map((t, k) => <span key={t} className="flex items-center gap-2">{k > 0 && <span className="text-tal-plum-soft/50">/</span>}{t}</span>)}
  </Box>
)
const Pill = ({ children }: { children: ReactNode }) => <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">{children}</span>
const Thumb = ({ src, size = 40 }: { src: string; size?: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className="shrink-0 rounded-lg bg-white object-cover ring-1 ring-tal-line" style={{ width: size, height: size }} />
)

// ── 1. Reminders ─────────────────────────────────────────────────────────────

type Status = "expired" | "soon" | "upcoming"
const StatusPill = ({ s }: { s: Status }) => (
  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${s === "expired" ? "bg-red-100 text-red-800" : s === "soon" ? "bg-amber-100 text-amber-900" : "bg-tal-cream-soft text-tal-plum-soft"}`}>
    {s === "expired" ? "Expired" : s === "soon" ? "Soon" : "Upcoming"}
  </span>
)
const ReminderRow = ({ y, thumb, title, due, s }: { y: number; thumb: string; title: string; due: string; s: Status }) => (
  <Box x={8} y={y} w={374} h={72} className="flex items-center gap-3 rounded-xl border border-tal-line bg-white px-4">
    <Thumb src={thumb} />
    <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{title}</div><div className="mt-0.5 text-xs text-tal-plum-soft">{due}</div></div>
    <StatusPill s={s} />
  </Box>
)
const T = "/thumbnails/subcategories/"
function Reminders() {
  return (
    <Phone h={930}>
      <Box x={8} y={116} w={374} h={132} className="rounded-2xl bg-black text-white shadow-md">
        <Box x={24} y={16} w={200} h={36} className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/thumbnails/dashboard/expiring-soon.webp" alt="" className="h-9 w-9 rounded-xl object-cover" />
          <Pill>Reminders</Pill>
        </Box>
        <Box x={226} y={16} w={124} h={36} className="flex items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-medium text-tal-plum"><Plus className="h-3.5 w-3.5" />Add reminder</Box>
        <Box x={24} y={60} w={326} h={32} className="font-display text-2xl leading-tight">What&apos;s coming up</Box>
        <Box x={24} y={96} w={326} h={20} className="text-sm text-white/80">1 expired · 6 upcoming</Box>
      </Box>
      <Box x={8} y={264} w={374} h={28} className="font-display text-xl">Expired</Box>
      <ReminderRow y={298} thumb="/thumbnails/categories/education.webp" title="First aid certificate — Sarah" due="Expired 5 days ago · 12 Nov 2026" s="expired" />
      <Box x={8} y={386} w={374} h={28} className="font-display text-xl">Upcoming</Box>
      <ReminderRow y={420} thumb={`${T}personal.vehicle_details.png`} title="Car registration — 482 KTV" due="Due in 9 days · 26 Nov 2026" s="soon" />
      <ReminderRow y={500} thumb={`${T}admin.budgets.png`} title="Bill due — Rent / board / mortgage — $2,250.00" due="Due in 14 days · 1 Dec 2026" s="soon" />
      <ReminderRow y={580} thumb={`${T}personal.drivers_licence.png`} title="Driver's licence — James Taylor" due="Due in 21 days · 8 Dec 2026" s="soon" />
      {/* Custom reminder row (CustomReminderRow) */}
      <Box x={8} y={660} w={374} h={88} className="rounded-xl border border-tal-line bg-white">
        <Box x={16} y={14} w={210} h={60}>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">CUSTOM</span>
            <span className="truncate text-sm font-medium">Book Leo&apos;s dentist check-up</span>
          </div>
          <div className="mt-1 flex items-center gap-2"><span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sky-800">yearly</span><span className="text-xs text-tal-plum-soft">Due in 26 days · 13 Dec 2026</span></div>
        </Box>
        <Box x={232} y={14} w={130} h={60} className="flex flex-col items-end gap-1.5">
          <StatusPill s="soon" />
          <span className="flex items-center gap-1 text-xs"><span className="px-1.5 text-tal-plum-soft">Snooze</span><span className="px-1.5 text-emerald-700">Done</span><span className="px-1 text-tal-plum-soft">×</span></span>
        </Box>
      </Box>
      <ReminderRow y={756} thumb={`${T}admin.vehicle_insurance.png`} title="Car insurance — Harbourside Insurance" due="Due in 34 days · 21 Dec 2026" s="upcoming" />
      <ReminderRow y={836} thumb={`${T}health.health_insurance.png`} title="Health insurance — Kinfolk Health" due="Due in 52 days · 8 Jan 2027" s="upcoming" />
    </Phone>
  )
}

// ── 2. Add a reminder -> Custom reminder ─────────────────────────────────────

const RENEW: [string, string, string, string][] = [
  ["Passport", "Personal · Expires 3 Aug 2031", "Update date", "violet"],
  ["Driver's licence & IDs", "Personal · Expires 8 Dec 2026", "Update date", "violet"],
  ["Car registration", "Personal · Expires 26 Nov 2026", "Update date", "violet"],
  ["Vehicle insurance", "Admin & Bookkeeping · Expires 21 Dec 2026", "Update date", "emerald"],
  ["Home insurance", "Admin & Bookkeeping · No expiry set", "Add date", "emerald"],
]
function AddPicker() {
  return (
    <Phone>
      <Crumbs items={["Reminders", "Add a reminder"]} />
      <Box x={8} y={144} w={374} h={126} className="rounded-2xl bg-black text-white shadow-md">
        <Box x={24} y={16} w={180} h={36} className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/thumbnails/dashboard/add-reminder.webp" alt="" className="h-9 w-9 rounded-xl object-cover" />
          <Pill>Reminders</Pill>
        </Box>
        <Box x={196} y={16} w={154} h={36} className="flex items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-medium text-tal-plum"><Plus className="h-3.5 w-3.5" />Custom reminder</Box>
        <Box x={24} y={60} w={326} h={32} className="font-display text-2xl leading-tight">Add a reminder</Box>
        <Box x={24} y={94} w={326} h={20} className="text-sm text-white/80">Pick something to add an expiry to.</Box>
      </Box>
      <Box x={8} y={286} w={374} h={80} className="flex items-center gap-3 rounded-2xl bg-tal-cream-soft p-4 ring-1 ring-tal-line">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white"><Plus className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><div className="font-medium leading-tight">Something else with a date</div><div className="mt-0.5 text-xs text-tal-plum-soft">Car service, appointments, errands, anything.</div></div>
        <span className="flex h-8 shrink-0 items-center rounded-lg bg-white px-2.5 text-xs font-medium">Custom reminder →</span>
      </Box>
      {RENEW.map(([t, d, cta, tone], k) => (
        <Box key={t} x={8} y={382 + k * 88} w={374} h={76} className={`flex items-center gap-3 rounded-2xl p-4 ring-1 ${tone === "violet" ? "bg-violet-50 ring-violet-100" : "bg-emerald-50 ring-emerald-100"}`}>
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white ${tone === "violet" ? "text-violet-800" : "text-emerald-800"}`}><Calendar className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><div className="font-medium leading-tight">{t}</div><div className="mt-0.5 text-xs text-tal-plum-soft">{d}</div></div>
          <span className={`flex h-8 shrink-0 items-center rounded-lg bg-white px-2.5 text-xs font-medium ${tone === "violet" ? "text-violet-800" : "text-emerald-800"}`}>{cta} →</span>
        </Box>
      ))}
    </Phone>
  )
}

const Label = ({ y, children }: { y: number; children: ReactNode }) => <Box x={8} y={y} w={374} h={18} className="text-sm">{children}</Box>
const Input = ({ y, w = 374, h = 44, children }: { y: number; w?: number; h?: number; children: ReactNode }) => (
  <Box x={8} y={y} w={w} h={h} className="flex items-center rounded-xl border border-tal-line bg-white px-3 text-[15px]">{children}</Box>
)
function CustomForm() {
  return (
    <Phone>
      <Crumbs items={["Reminders", "Add a reminder", "Custom"]} />
      <Box x={8} y={144} w={374} h={124} className="rounded-2xl bg-black px-6 py-4 text-white shadow-md">
        <div className="font-display text-2xl leading-tight">Custom reminder</div>
        <p className="mt-1 text-sm text-white/80">For anything that isn&apos;t in your Organiser yet — a service booking, an errand, a renewal date. We&apos;ll send a push 7 days before.</p>
      </Box>
      <Label y={290}>Title</Label><Input y={310}>Service the family SUV</Input>
      <Label y={368}>Due date</Label><Input y={388} w={180}>15/12/2026</Input>
      <Label y={446}>Repeat</Label><Input y={466} w={180}>Every year ▾</Input>
      <Label y={524}>Link to a record (optional)</Label><Input y={544}>Car registration — 482 KTV · Personal ▾</Input>
      <Box x={8} y={592} w={374} h={16} className="text-xs text-tal-plum-soft">Clicking the reminder will take you straight to the record.</Box>
      <Label y={618}>Notes (optional)</Label>
      <Box x={8} y={638} w={374} h={92} className="rounded-xl border border-tal-line bg-white p-3 text-[15px]">Book with Hilltop Auto — ask them to check the brakes.</Box>
      <Box x={8} y={750} w={150} h={44} className="flex items-center justify-center rounded-xl bg-black font-medium text-white">Save reminder</Box>
    </Phone>
  )
}

// ── 3. Push notifications on the lock screen ─────────────────────────────────

const PUSHES = [
  { t: "Bill coming up", b: "Rent / board / mortgage — $2,250.00 · due in 7 days", when: "now" },
  { t: "5 items need attention", b: "First aid certificate — Sarah · +4 more", when: "1m ago" },
]
function LockScreen() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#3b2a2e] via-[#23191b] to-black font-sans text-white">
      <StatusBar dark time="7:30" />
      <Box x={0} y={96} w={W} h={110} className="text-center"><p className="text-7xl font-thin">7:30</p><p className="text-sm text-white/70">Tuesday 24 November</p></Box>
      {PUSHES.map((n, k) => (
        <motion.div key={n.t} initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + k * 0.6 }}
          className={`absolute rounded-2xl p-3 backdrop-blur ${k === 0 ? "bg-white/20 ring-2 ring-white/40" : "bg-white/15"}`} style={{ left: 12, top: 250 + k * 96, width: 366 }}>
          <div className="mb-1 flex items-center gap-2 text-xs text-white/70">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons-pwa/icon-192.png" alt="" className="h-5 w-5 rounded" />THE ADULTING LIFE<span className="ml-auto">{n.when}</span>
          </div>
          <p className="text-sm font-semibold">{n.t}</p>
          <p className="text-[13px] leading-snug text-white/90">{n.b}</p>
        </motion.div>
      ))}
      <Box x={0} y={500} w={W} h={40} className="px-10 text-center text-xs text-white/50">Tap one to open Reminders or your budget</Box>
    </div>
  )
}

// ── 4. Tasks ─────────────────────────────────────────────────────────────────

const TASKS: [string, string, boolean][] = [
  ["Renew rego for the family SUV", "Due 26 Nov 2026 · → Car registration — 482 KTV", false],
  ["Sign Leo's school camp form", "Due 20 Nov 2026", false],
  ["Upload Mia's Year 9 report card", "Added 10 Nov 2026", false],
  ["Compare health insurance quotes", "Due 5 Jan 2027", false],
  ["Pay Mia's music lessons", "Due 6 Nov 2026", true],
  ["Book James's eye test", "Added 2 Nov 2026", true],
]
function Tasks({ ticked }: { ticked?: boolean }) {
  const open = ticked ? 3 : 4
  return (
    <Phone>
      <Box x={8} y={116} w={374} h={100} className="rounded-2xl bg-black px-6 py-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/thumbnails/dashboard/tasks.webp" alt="" className="h-9 w-9 rounded-xl object-cover" />
          <Pill>Tasks</Pill>
          <span className="font-display text-2xl leading-tight">Your list</span>
        </div>
        <div className="mt-2 text-sm text-white/80"><span className="mr-2 text-white/40">·</span>{open} things to do</div>
      </Box>
      <Box x={8} y={232} w={374} h={40} className="flex items-center">
        <span className="inline-flex rounded-lg border border-tal-line bg-white p-1 text-xs font-medium">
          <span className="flex h-8 items-center rounded-md px-3 text-tal-plum-soft">Open ({open})</span>
          <span className="flex h-8 items-center rounded-md bg-black px-3 text-white">All (6)</span>
        </span>
        <span className="ml-auto flex h-9 items-center gap-1.5 rounded-lg border border-tal-line bg-tal-cream-soft px-3 text-sm font-medium"><Plus className="h-3.5 w-3.5" />Add a task</span>
      </Box>
      {TASKS.map(([t, sub, done0], k) => {
        const done = done0 || (ticked && k === 1)
        return (
          <Box key={t} x={8} y={288 + k * 72} w={374} h={64} className={`flex items-center gap-3 rounded-xl border border-tal-line p-3 ${done ? "bg-tal-cream-soft/60" : "bg-white"}`}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${done ? "border-emerald-600 bg-emerald-600 text-white" : "border-tal-line"}`}>{done && "✓"}</span>
            <div className="min-w-0 flex-1">
              <div className={`truncate text-sm ${done ? "text-tal-plum-soft line-through" : "font-medium"}`}>{t}</div>
              <div className="mt-0.5 truncate text-xs text-tal-plum-soft">{sub}</div>
            </div>
            <span className="text-tal-plum-soft">×</span>
          </Box>
        )
      })}
    </Phone>
  )
}

// ── 5. Emergency ─────────────────────────────────────────────────────────────

const ESection = ({ y, h, label, n, tone, children }: { y: number; h: number; label: string; n: number; tone: string; children: ReactNode }) => (
  <Box x={8} y={y} w={374} h={h} className="overflow-hidden rounded-2xl border border-tal-line bg-white shadow-sm">
    <div className="flex h-14 items-center gap-3 border-b border-tal-line bg-tal-cream-soft/50 px-5">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${tone}`}><Folder className="h-4 w-4" /></span>
      <span className="font-display text-lg">{label}</span>
      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-800">{n}</span>
      <span className="ml-auto text-xs text-tal-plum-soft">Edit →</span>
    </div>
    {children}
  </Box>
)
const ERecord = ({ name, who, fields }: { name: string; who: string; fields: [string, string][] }) => (
  <div className="border-b border-tal-line p-4 last:border-0">
    <div className="mb-1.5 flex items-baseline justify-between"><span className="font-medium">{name}</span><span className="text-xs text-tal-plum-soft">{who}</span></div>
    <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5 text-sm">{fields.map(([l, v]) => <div key={l} className="contents"><span className="text-tal-plum-soft">{l}</span><span>{v}</span></div>)}</div>
  </div>
)
function Emergency() {
  return (
    <Phone>
      <Crumbs items={["Dashboard", "Emergency"]} />
      <Box x={8} y={144} w={374} h={124} className="rounded-2xl bg-red-600 px-5 py-3 text-white shadow-md">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20"><AlertTriangle className="h-5 w-5" /></span>
          <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider">In case of emergency</span>
          <span className="flex h-8 w-9 items-center justify-center rounded-xl border border-tal-line bg-white text-tal-plum"><Download className="h-4 w-4" /></span>
          <span className="flex h-8 w-9 items-center justify-center rounded-xl border border-tal-line bg-white text-tal-plum"><Send className="h-4 w-4" /></span>
          <span className="flex h-8 items-center rounded-xl bg-white/15 px-2.5 text-xs font-medium">Excel</span>
        </div>
        <div className="mt-2 font-display text-xl leading-tight">Everything a paramedic, hospital or trusted person might need</div>
      </Box>
      <Box x={8} y={280} w={374} h={20} className="text-sm text-tal-plum-soft">14 records across 4 family members</Box>
      <ESection y={312} h={272} label="Emergency contacts" n={2} tone="bg-violet-500">
        <ERecord name="Emma Clarke" who="Sarah Taylor" fields={[["Relationship", "Sister (next of kin)"], ["Mobile", "0412 345 678"], ["Suburb", "Carindale QLD"]]} />
        <ERecord name="James Taylor" who="Sarah Taylor" fields={[["Relationship", "Partner"], ["Mobile", "0423 456 789"]]} />
      </ESection>
      <ESection y={600} h={176} label="Current medications" n={1} tone="bg-amber-500">
        <ERecord name="Asthma reliever inhaler" who="Leo Taylor" fields={[["Dose", "2 puffs when needed"], ["Prescribed by", "Dr Priya Nair"], ["Notes", "Spare in his school bag"]]} />
      </ESection>
      <ESection y={792} h={140} label="Doctors & medical advisers" n={1} tone="bg-amber-500">
        <ERecord name="Dr Priya Nair" who="Sarah Taylor" fields={[["Practice", "Bayside Family Practice"]]} />
      </ESection>
    </Phone>
  )
}

// ── 6. Learn ─────────────────────────────────────────────────────────────────

const LEARN_H = 1310
const PATHS: [string, string, number, number, string, string][] = [
  ["Personal", "personal", 9, 14, "bg-violet-100 ring-violet-200", "text-violet-800 bg-violet-500"],
  ["Health", "health", 5, 12, "bg-amber-100 ring-amber-200", "text-amber-900 bg-amber-500"],
  ["Education", "education", 3, 10, "bg-sky-100 ring-sky-200", "text-sky-900 bg-sky-500"],
  ["Employment", "employment", 4, 12, "bg-rose-100 ring-rose-200", "text-rose-900 bg-rose-500"],
  ["Admin & Bookkeeping", "admin", 2, 13, "bg-emerald-100 ring-emerald-200", "text-emerald-900 bg-emerald-600"],
]
const ART = "TAL — Vehicle Details & Copy of Registration Certificate"
function LearnHub({ streak = 4, read = 23 }: { streak?: number; read?: number }) {
  const pct = Math.round((read / 61) * 100)
  return (
    <Phone h={LEARN_H}>
      <Box x={8} y={116} w={374} h={136} className="rounded-2xl border border-tal-line bg-tal-cream-soft px-5 py-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/thumbnails/learn/adulting-hub.webp" alt="" className="h-10 w-10 shrink-0 rounded-xl bg-white object-cover ring-1 ring-white" />
          <span className="font-display text-2xl leading-tight">The Adulting Life Unlocked</span>
        </div>
        <p className="mt-2 text-sm text-tal-plum-soft"><span className="mr-2 text-tal-plum-soft/50">·</span>Practical lessons to help you navigate life with confidence.</p>
      </Box>
      <Box x={8} y={268} w={374} h={176} className="rounded-2xl bg-violet-100 p-5 ring-1 ring-violet-200">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-violet-800">Resume lesson</div>
        <div className="flex items-start gap-3">
          <Thumb src="/thumbnails/categories/personal.webp" size={48} />
          <div className="min-w-0"><div className="line-clamp-2 font-display text-lg leading-tight">{ART}</div><div className="mt-1 text-xs text-tal-plum-soft">Personal · 4 min read</div></div>
        </div>
        <div className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-black px-3 text-sm font-medium text-white">Resume lesson →</div>
      </Box>
      <Box x={8} y={460} w={374} h={156} className="overflow-hidden rounded-2xl bg-tal-cream p-5 ring-1 ring-tal-cream">
        <div className="absolute right-4 top-4 text-2xl">🏆</div>
        <div className="mb-1 text-[10px] font-medium uppercase tracking-widest">Keep going</div>
        <div className="font-display text-xl leading-tight">You&apos;re becoming an Adulting Pro!</div>
        <div className="mt-3 flex items-baseline gap-2"><span className="font-display text-2xl leading-none">{pct}%</span><span className="text-sm text-tal-plum-soft">complete</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full bg-gradient-to-r from-violet-500 to-tal-plum" style={{ width: `${pct}%` }} /></div>
        <div className="mt-2 flex justify-between text-xs"><span className="text-tal-plum-soft">{read} of 61 lessons read</span><span className="font-medium">Next lesson →</span></div>
      </Box>
      <Box x={8} y={636} w={374} h={28} className="flex items-baseline justify-between"><span className="font-display text-xl">Your Learning Paths</span><span className="text-[11px] text-tal-plum-soft">{read} of 61 complete</span></Box>
      {PATHS.map(([label, id, done0, total, bg, tone], k) => {
        const done = id === "personal" ? done0 + (read - 23) : done0
        const p = Math.round((done / total) * 100)
        const [text, bar] = [tone.split(" ")[0], tone.split(" ")[1]]
        return (
          <Box key={id} x={8 + (k % 2) * 193} y={672 + Math.floor(k / 2) * 162} w={181} h={150} className={`flex flex-col rounded-2xl p-4 ring-1 ${bg}`}>
            <Thumb src={`/thumbnails/categories/${id}.webp`} size={48} />
            <div className={`mt-2 text-sm font-medium leading-tight ${text}`}>{label}</div>
            <div className="mt-0.5 text-[11px] text-tal-plum-soft">{total} lessons</div>
            <div className="mt-auto h-1.5 overflow-hidden rounded-full bg-white/70"><div className={`h-full ${bar}`} style={{ width: `${p}%` }} /></div>
            <div className="mt-1.5 flex justify-between text-[10px] text-tal-plum-soft"><span>{done}/{total}</span><span className="font-medium">{p}%</span></div>
          </Box>
        )
      })}
      <Box x={8} y={1170} w={374} h={118} className="rounded-2xl bg-amber-100 p-5 ring-1 ring-amber-200">
        <div className="flex items-start justify-between">
          <div><div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-amber-900">Learning streak</div><div className="mt-1 flex items-baseline gap-2"><span className="font-display text-4xl leading-none text-amber-900">{streak}</span><span className="text-sm text-amber-900/80">days</span></div></div>
          <span className="text-3xl">🔥</span>
        </div>
        <div className="mt-1 text-xs text-amber-900/80">Longest: 9 days</div>
      </Box>
    </Phone>
  )
}

function Article() {
  return (
    <Phone>
      <Crumbs items={["Learn", "Personal"]} />
      <Box x={8} y={144} w={374} h={128} className="flex items-center gap-4 rounded-2xl bg-black px-5 text-white shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${T}personal.vehicle_details.png`} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-white object-cover ring-2 ring-white/20" />
        <div className="min-w-0">
          <div className="line-clamp-2 font-display text-xl leading-tight">{ART}</div>
          <div className="mt-1 truncate text-sm text-white/70">If you own a car, this section keeps track of important info</div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium"><Clock className="h-3 w-3" />4 min read</div>
        </div>
      </Box>
      <Box x={8} y={288} w={374} h={250} className="space-y-3 overflow-hidden rounded-2xl border border-tal-line bg-white p-6 text-[15px] leading-relaxed shadow-sm">
        <p>If you own a car, this section keeps track of important info like your car’s registration number and the details of your car (make, model, etc.).</p>
        <p>It’s important because you’ll need this to renew your rego, sell your car, or in case of an accident.</p>
        <p className="text-tal-plum-soft">In Australia, car registration is managed at the state and territory level…</p>
      </Box>
      <Box x={8} y={554} w={374} h={290} className="rounded-2xl border border-tal-line bg-gradient-to-br from-white to-tal-cream-soft p-6">
        <span className="absolute left-6 top-6 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-200 text-xl text-violet-900">✓</span>
        <Box x={88} y={24} w={262} h={130}>
          <div className="font-display text-lg leading-tight">Nice one — you&apos;ve finished this article.</div>
          <p className="mt-1 text-sm text-tal-plum-soft">Test your knowledge with a quick quiz, or move on to the next article.</p>
        </Box>
        <Box x={88} y={120} w={130} h={40} className="flex items-center justify-center rounded-xl bg-black text-sm font-medium text-white">Mark as read</Box>
        <Box x={24} y={206} w={326} h={68} className="flex flex-col rounded-xl border border-tal-line bg-white p-3">
          <div className="text-[10px] uppercase tracking-widest text-tal-plum-soft">Quiz 1</div>
          <div className="flex-1 text-sm font-medium">Registering your car in Australia</div>
          <div className="text-xs font-medium">Take it →</div>
        </Box>
      </Box>
    </Phone>
  )
}

const OPTS = ["The federal government", "Your state or territory", "Your car insurer", "Your local council"]
function Quiz({ result }: { result?: boolean }) {
  return (
    <Phone h={900}>
      <Box x={8} y={116} w={374} h={20} className="text-sm text-tal-plum-soft">← Personal</Box>
      <Box x={8} y={144} w={374} h={130} className="rounded-2xl bg-black px-6 py-4 text-white shadow-md">
        <Pill>Quiz</Pill>
        <div className="mt-2 font-display text-2xl leading-tight">Registering your car in Australia</div>
        <div className="mt-1 text-sm text-white/70"><span className="mr-2 text-white/40">·</span>3 questions</div>
      </Box>
      {result ? (
        <Box x={8} y={298} w={374} h={300} className="flex flex-col items-center justify-center rounded-3xl border-2 border-tal-forest bg-gradient-to-br from-tal-forest to-tal-forest-dark p-8 text-center text-white shadow-lg">
          <motion.div className="mb-3 text-6xl" initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.4 }}>🎉</motion.div>
          <div className="mb-2 font-display text-3xl">3 / 3</div>
          <div className="mb-3 text-lg font-medium text-white/90">100%</div>
          <div className="text-sm text-white/80">Perfect — nice work.</div>
        </Box>
      ) : (
        <>
          <Box x={8} y={290} w={374} h={64} className="rounded-2xl border border-tal-line bg-white/90 px-4 py-3 shadow-sm">
            <div className="mb-2 flex justify-between"><span className="text-sm font-medium">1 of 3 answered</span><span className="text-sm text-tal-plum-soft">33%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-tal-cream"><div className="h-full w-1/3 bg-gradient-to-r from-tal-forest to-tal-plum" /></div>
          </Box>
          <Box x={8} y={374} w={374} h={360} className="rounded-2xl border-2 border-tal-forest/40 bg-white">
            <span className="absolute -top-3 left-4 rounded-full bg-black px-3 py-1 text-xs font-medium uppercase tracking-wider text-white">Question 1</span>
            <Box x={20} y={28} w={334} h={60} className="text-lg font-medium">Who looks after car registration in Australia?</Box>
            {OPTS.map((o, k) => (
              <Box key={o} x={20} y={100 + k * 62} w={334} h={54} className={`flex items-center gap-3 rounded-xl border-2 p-3 ${k === 1 ? "border-tal-forest bg-tal-forest/5" : "border-tal-line bg-white"}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${k === 1 ? "bg-tal-forest text-white" : "bg-tal-cream-soft text-black"}`}>{"ABCD"[k]}</span>
                <span className={k === 1 ? "font-medium" : ""}>{o}</span>
              </Box>
            ))}
          </Box>
          <Box x={8} y={754} w={374} h={140} className="rounded-2xl border-2 border-tal-line bg-white">
            <span className="absolute -top-3 left-4 rounded-full bg-black px-3 py-1 text-xs font-medium uppercase tracking-wider text-white">Question 2</span>
            <Box x={20} y={28} w={334} h={60} className="text-lg font-medium">Which document proves your car is registered?</Box>
          </Box>
        </>
      )}
    </Phone>
  )
}

// ── Steps ────────────────────────────────────────────────────────────────────

const SCREENS: Record<string, ReactNode> = {
  reminders: <Reminders />,
  picker: <AddPicker />,
  custom: <CustomForm />,
  push: <LockScreen />,
  tasks: <Tasks />,
  tasksDone: <Tasks ticked />,
  emergency: <Emergency />,
  learn: <LearnHub />,
  article: <Article />,
  quiz: <Quiz />,
  result: <Quiz result />,
  streak: <LearnHub streak={5} read={24} />,
}

const FIXED: Record<string, ReactNode> = { streak: <><StatusBar /><AppHeader /></> }

const STEPS: WalkStep[] = [
  { screen: "reminders", caption: "What's coming up", detail: "Every date across the family in one list - expired first, then what's due soonest.",
    focus: { x: 195, y: 330, scale: 1.1 }, ring: { x: 8, y: 116, w: 374, h: 132 }, duration: 6500 },
  { screen: "reminders", caption: "Rego, licences, insurance", detail: "Picked up from the expiry dates in your records - plus bills from your budget and your own custom reminders.",
    focus: { x: 195, y: 560, scale: 1.05 }, ring: { x: 8, y: 420, w: 374, h: 232 }, duration: 7500 },
  { screen: "reminders", caption: "Add a reminder", focus: { x: 260, y: 200, scale: 1.4 }, ring: { x: 234, y: 132, w: 124, h: 36 }, click: { x: 296, y: 150 }, duration: 4500 },
  { screen: "picker", caption: "Pick what it's for", detail: "Passport, licence, rego, insurance... or something else with a date.",
    focus: { x: 195, y: 440, scale: 1.1 }, ring: { x: 8, y: 286, w: 374, h: 80 }, click: { x: 320, y: 326 }, duration: 6500 },
  { screen: "custom", caption: "A custom reminder", detail: "Title, date, repeat every year, and link it to the car's record. Custom reminders can be snoozed or marked done.",
    focus: { x: 195, y: 560, scale: 1.08 }, ring: { x: 8, y: 750, w: 150, h: 44 }, click: { x: 83, y: 772 }, duration: 7500 },
  { screen: "push", caption: "A nudge on your phone", detail: "A push 7 days before a custom reminder, bills at the time you chose, and a daily heads-up when things are close.",
    duration: 8000 },
  { screen: "tasks", caption: "Tasks: your to-do list", detail: "Things to do, with due dates, linked to the record they're about.",
    focus: { x: 195, y: 400, scale: 1.1 }, ring: { x: 8, y: 360, w: 374, h: 64 }, click: { x: 32, y: 392 }, duration: 6500 },
  { screen: "tasksDone", caption: "Tick it off", detail: "Leo's camp form is signed. One less thing.",
    focus: { x: 195, y: 400, scale: 1.1 }, ring: { x: 8, y: 360, w: 374, h: 64 }, duration: 5500 },
  { screen: "emergency", caption: "Emergency details, on hand", detail: "Contacts, medications, doctors, Medicare and insurance for the whole family on one page - download or share it as a PDF.",
    focus: { x: 195, y: 420, scale: 1.05 }, ring: { x: 8, y: 144, w: 374, h: 124 }, duration: 8000 },
  { screen: "learn", caption: "Learn as you go", detail: "Short lessons on the adulting stuff nobody teaches you - pick up where you left off.",
    focus: { x: 195, y: 440, scale: 1.08 }, ring: { x: 8, y: 268, w: 374, h: 176 }, click: { x: 90, y: 404 }, duration: 6500 },
  { screen: "article", caption: "Read the lesson", detail: "Why your rego details matter, and what to keep. Then mark it read.",
    focus: { x: 195, y: 620, scale: 1.1 }, ring: { x: 96, y: 674, w: 130, h: 40 }, click: { x: 161, y: 694 }, duration: 6500 },
  { screen: "quiz", caption: "Then a quick quiz", detail: "Three questions to check it stuck.",
    focus: { x: 195, y: 520, scale: 1.1 }, ring: { x: 28, y: 536, w: 334, h: 54 }, click: { x: 195, y: 563 }, duration: 6000 },
  { screen: "result", caption: "3 out of 3", detail: "Perfect - nice work.", focus: { x: 195, y: 420, scale: 1.1 }, duration: 5000 },
  { screen: "streak", scroll: 466, caption: "Keep the streak going", detail: "Your progress and learning streak go up as you learn - 5 days and counting.",
    focus: { x: 195, y: 1230, scale: 1.05 }, ring: { x: 8, y: 1170, w: 374, h: 118 }, duration: 7000 },
]

export default function RemindersWalkthrough({ autoStart = false }: { autoStart?: boolean }) {
  return (
    <WalkthroughPlayer music="/audio/demo-music-upbeat.mp3" device="phone" steps={STEPS} screens={SCREENS} fixed={FIXED} title="Staying on top of things" autoStart={autoStart}
      intro={{ title: "Stay on top of things", subtitle: "Reminders before things expire, a to-do list, emergency details and bite-sized lessons." }} />
  )
}
