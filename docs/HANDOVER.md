# The Adulting Life — Handover / Context Doc

_Latest session state. Read this first when opening a new Claude session so
context is not lost. Date: 2026-07-07._

---

## 1. Project at a glance

- **Repo:** https://github.com/timtam54/theadultinglife  (branch: `main`)
- **Local path:** `/Users/timhams/Documents/theadultinglife`
- **Live URL:** https://theadultinglife.vercel.app
- **Marketing site:** https://theadultinglife.com.au
- **Stack:** Next.js 16.2.10 (App Router) + React 19 + TypeScript + Tailwind v4 + Supabase (Postgres + Storage) + Vercel
- **PWA:** installable, custom manifest, service worker, install-prompt component
- **AGENTS.md rule:** Next.js 16 has breaking async changes vs training data (`cookies()`, `headers()`, `params`, `searchParams` are all promises). Always read `node_modules/next/dist/docs/` before writing new Next code.

## 2. Auth model (mirrors Moodkin project at `/Users/timhams/Documents/moodkin`)

- Custom auth, **NOT** NextAuth. Uses `bcryptjs`, `jose`, `nodemailer`, `@supabase/supabase-js`.
- Session = base64-encoded JSON `{userId, expiresAt}` in httpOnly cookie **`adultinglife_session`**, 30-day TTL.
- Password: bcrypt 12 rounds; 10-char min, letters+numbers; SHA-256 token hashes; `timingSafeEqual` compare.
- Rate limiting: in-memory per-IP + per-account.
- All auth state in single `users` table.
- Protection: inline `requireSession()`; no middleware.ts.
- Providers: **all 4 working**
  - Google ✅ (`sk_publishable_...` style creds in place)
  - Microsoft ✅
  - Apple ✅ (took the most work — `SameSite=None` cookie for cross-site POST callback)
  - Email + password ✅ (reset emails currently stub-log to server console; no SMTP configured yet)

## 3. Deployment

- Vercel auto-deploys on push to `main`.
- Vercel env vars set for `NEXT_PUBLIC_APP_URL`, all `SUPABASE_*`, all `GOOGLE_*`, `MICROSOFT_*`, `APPLE_*` (Production and Preview envs).
- `NEXT_PUBLIC_APP_URL` MUST NOT have a trailing slash (baked into build). Code also strips it defensively in `lib/auth/oauth-config.ts`.
- Sign-out redirects to https://theadultinglife.com.au/ (303) — this was a fix in this session.

## 4. Env vars — cheatsheet

Local: `/Users/timhams/Documents/theadultinglife/.env.local` (gitignored)
Vercel: dashboard → theadultinglife → Settings → Environment Variables

```
NEXT_PUBLIC_APP_URL              https://theadultinglife.vercel.app  (Vercel)
                                 http://localhost:3000               (local)
NEXT_PUBLIC_SUPABASE_URL         https://ykkshsxsqykskbovusvu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY    sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY        sb_secret_...

GOOGLE_CLIENT_ID                 <in .env.local + Vercel>
GOOGLE_CLIENT_SECRET             GOCSPX-...

MICROSOFT_CLIENT_ID              b0af98ec-e8e6-40af-bdf7-ad7e43bebc90
MICROSOFT_CLIENT_SECRET          HiN8Q~...
MICROSOFT_TENANT_ID              common

APPLE_CLIENT_ID                  com.theadultinglife.app.signin
APPLE_TEAM_ID                    B25XZGD4VW
APPLE_KEY_ID                     BS72Z97LCJ
APPLE_PRIVATE_KEY                <PEM contents; in Vercel as raw multiline; in .env.local as one-line with \n>

EMAIL_USER / EMAIL_PASSWORD      not set — reset emails stub-log to console
```

The Apple .p8 file lives at `secrets/AuthKey_BS72Z97LCJ.p8` (gitignored via `/secrets/` + `*.p8` in `.gitignore`). Also at `~/Documents/apple-keys/` as backup.

## 5. Data model — current

Migration files in `supabase/migrations/`:
- `001_init.sql` ✅ RAN in Supabase
  - `users`, `categories` (5 seeded), `records`, `file_objects`, `content_items`, `quizzes`, `questions`, `quiz_results`, `progress_items`
  - RLS enabled on user-scoped tables; service_role bypasses; anon/authenticated get no policies
- `002_subcategories.sql` ⏳ WRITTEN, **NOT YET RUN**
  - New `subcategories` table (79 rows across the 5 categories — see next section)
- `003_records_files_subcategory.sql` ⏳ WRITTEN, **NOT YET RUN**
  - Adds `subcategory_id` FK to `records` and `file_objects` (nullable — no existing data)

Storage: bucket `user-files` (public OFF) — created and working.

## 6. Life Admin section — the spec we are executing on

Source: `/Users/timhams/Documents/theadultinglife/lifeadminorganiser/*.pdf` (5 PDFs are the printed divider set from the physical book). The **first page of each PDF lists all subcategories** for that category, in exact order.

The 5 categories map to fixed subcategory lists (all seeded in migration 002):

| Category   | Count | Highlights |
|------------|------:|------------|
| Personal   | 17    | General Info Form, Birth Certs, Passport, Will, POA, TFN, ABN, List of Accounts, Vehicle Details, Accident Form, Daily Routine Planner, Other |
| Health     | 21    | Medical Advisers, Medication List, Health/Life Insurance, My Health Plan, Dental, Scripts, Blood Tests, Specialist Reports, Referrals, Hospital Discharge, Medical Bills, Meal Planning, Life Goals, Mind Set, Retirement/Pension |
| Education  | 10    | Courses & Enrolment Form, Enrolment Docs, Primary/Secondary/Tertiary/Other Results, Achievement Certs, Study Plan, Course Storage, Other |
| Employment | 12    | Employee Info Form, Cover Letter, Resume, Letters of Rec, Volunteering Certs, Contracts, Job Description, Reviews, Correspondence, Wages, Annual Payment Summary, Other |
| Admin      | 19    | Bank Accounts, Statements, Loans, Budgets, Investments, Super, Property, Tax Report/Payment Plans, Insurance x3, Utilities x3, Rates & Water, Rental, Warranties, Invoices Jul-Jun, Other |

`tal_form=true` on the ~10 "TAL — ..." items — these will get bespoke structured forms in a later pass. Right now they're treated the same as any subcategory divider at the data layer.

## 7. Where we are — task list

Task IDs from the todo tracker:

- [x] #14 Add subcategories table + seed all 5 categories
  - `supabase/migrations/002_subcategories.sql` written, awaiting user to run in Supabase.
- [ ] #15 Add `subcategory_id` to records + files
  - `supabase/migrations/003_records_files_subcategory.sql` written, awaiting user to run.
- [ ] #16 DB + service layer for subcategories
  - Create `lib/db/subcategories.ts` (list, get)
  - Create `lib/services/subcategories.ts`
  - Update `lib/services/records.ts` and `lib/db/records.ts` to accept/filter by `subcategoryId`
  - Update `lib/db/types.ts` — add `SubcategoryRow` interface + `subcategory_id` to `RecordRow` and `FileRow`
  - Update `lib/services/files.ts` and `lib/db/files.ts` to accept `subcategoryId`
- [ ] #17 API routes: subcategories + patched records/files
  - `GET /api/subcategories?categoryId=personal` returns the seeded list for that category
  - `POST /api/records` and `POST /api/files` accept optional `subcategoryId`
  - `GET /api/records?subcategoryId=...` filters by it
- [ ] #18 UI: category → subcategory → records flow
  - Rework `app/(app)/records/[category]/page.tsx` to list the fixed subcategory dividers with per-subcategory record counts + expiring-soon banner scoped to category
  - New route `app/(app)/records/[category]/[subcategory]/page.tsx` — shows records + files under that divider
  - Update `components/RecordEditor.tsx` to accept + select a subcategory (via preselected prop when creating from a divider)
  - Preserve current cross-category search + expiry status pill
  - Style dividers using the coloured accent from the PDFs (each category has a signature colour — Personal purple, Health yellow, Education teal, Employment coral, Admin green) — optional flourish; can defer.
- [ ] #19 Verify build + smoke test
  - `npx tsc --noEmit`, `npm run build`, hit each new route locally, confirm existing records/files still work, deploy

## 8. Immediate next action for the user

**Run the two migration files in Supabase SQL editor:**

1. Paste `supabase/migrations/002_subcategories.sql` → Run
2. Paste `supabase/migrations/003_records_files_subcategory.sql` → Run
3. Sanity check:
   ```sql
   select category_id, count(*) from subcategories group by category_id order by category_id;
   ```
   Expected:
   ```
   admin      | 19
   education  | 10
   employment | 12
   health     | 21
   personal   | 17
   ```

Then in the next session say: **"migrations run, proceed with tasks 15–19"** and Claude will continue from there.

## 9. Key files map

```
app/
├── (app)/                         Protected app shell (requireSession)
│   ├── layout.tsx                 Header + nav + sign-out
│   ├── dashboard/page.tsx         3 cards
│   ├── records/                   Section 1 — Life Admin
│   ├── files/                     Section 2 — Documents (Supabase Storage)
│   └── learn/                     Section 3 — Learning (from content/learning.ts)
├── api/
│   ├── auth/{google,microsoft,apple}/{route,callback/route}.ts
│   ├── auth/password/{login,request,set,check-token}/route.ts
│   ├── auth/{session,logout}/route.ts
│   ├── records/{route,[id]/route}.ts
│   ├── files/{route,[id]/route}.ts
│   ├── progress/route.ts
│   └── quizzes/[id]/submit/route.ts
├── login/page.tsx                 OAuth + email UI (mirrors Moodkin flow)
├── set-password/page.tsx
├── offline/page.tsx
├── manifest.ts                    PWA manifest
├── layout.tsx                     Root layout, fonts, RegisterSW / PWAInstall
└── page.tsx                       Redirect to /dashboard or /login

components/
├── BrandLogo.tsx
├── FilesClient.tsx
├── MarkContentRead.tsx
├── PWAInstall.tsx                 Install-prompt banner (Moodkin pattern)
├── QuizRunner.tsx
├── RecordEditor.tsx               Needs subcategory select added
└── StatusPill.tsx

lib/
├── auth/
│   ├── apple.ts                   Apple client-secret JWT via jose
│   ├── google.ts, microsoft.ts
│   ├── oauth-config.ts            Env-driven; trailing-slash safe
│   ├── oauth-service.ts           upsertOAuthUser
│   ├── oauth-state.ts             CSRF cookie; SameSite=None for Apple only
│   ├── password.ts, password-email.ts
│   ├── rate-limit.ts
│   └── session.ts
├── db/
│   ├── files.ts, records.ts, users.ts, progress.ts, types.ts
│   └── (subcategories.ts to be added)
├── services/
│   ├── files.ts, records.ts
│   └── (subcategories.ts to be added)
└── supabase/
    ├── server.ts                  Cached service-role client
    └── storage.ts                 SAS-equivalent signed URLs

content/learning.ts                Static articles / guides / quizzes

public/
├── Logo.png                       Source wordmark
├── favicon.ico, apple-touch-icon.png
├── icons-pwa/                     PWA icon set 72–512, plus maskable
├── sw.js                          Minimal service worker
└── vercel.svg, next.svg, ...

supabase/migrations/
├── 001_init.sql                   ✅ ran
├── 002_subcategories.sql          ⏳ ready to run
└── 003_records_files_subcategory.sql  ⏳ ready to run

secrets/                           GITIGNORED — never commit
└── AuthKey_BS72Z97LCJ.p8

docs/
├── phase-1-build-log.md          Earlier session transcript
└── HANDOVER.md                    This file
```

## 10. Session-specific gotchas (things Claude has already learned)

- **Trailing slash on `NEXT_PUBLIC_APP_URL`** breaks OAuth redirect URIs (`//api/auth/...`). Baked at build time. Code strips defensively but Vercel env var must also be clean.
- **Apple's callback is a cross-site POST.** State cookie MUST be `SameSite=None; Secure` for Apple; Lax is fine for Google/Microsoft. See `lib/auth/oauth-state.ts:sameSiteFor()`.
- **Apple sends `name` only on first authorisation** — code parses the `user` form field (JSON) if present, doesn't error if missing.
- **PEM env vars pick up leading whitespace when pasted from markdown chat.** Use `cat secrets/AuthKey_*.p8 | pbcopy` to avoid it. Vercel accepts raw multiline PEM; `.env.local` needs single-line with `\n` escapes; code does `.replace(/\\n/g, "\n")` (no-op on raw newlines).
- **App-level `app/favicon.ico`** takes precedence over `public/favicon.ico`. Deleted the Next default one so ours wins.
- **Wordmark is landscape (2560×892) but PWA icons must be square.** Solved by rendering an SVG icon from scratch: `THE` (Poppins) at top with side rules, `Adulting` + `Life` (Dancing Script Bold) stacked, `D2H BOOKS` at bottom, on brand cream `#ffe7ce`, with plum-dark border. Rendered via `rsvg-convert` (installed via Homebrew: `librsvg`). Fonts installed to `~/Library/Fonts/` (fontconfig picks them up).
- **Reset emails stub-log** to server console until SMTP creds arrive. Look for `[password-email] STUB` in Vercel Logs for the reset link when testing.
- **Secrets seen in this session** (rotate before real launch): Apple private key, Google client secret, Microsoft client secret, Supabase service-role key.

## 11. Brand

- Primary/accent: `#4c373c` (plum)
- Deep dark: `#23191b`
- Cream: `#ffe7ce`
- Cream-soft (bg): `#fff5e6`
- Line: `#e6dcd0`
- Headings: Poppins (via `next/font/google`)
- Body: Source Sans 3 (via `next/font/google`)
- Custom Tailwind tokens defined in `app/globals.css` under `@theme inline`:
  `bg-tal-plum`, `bg-tal-plum-dark`, `bg-tal-plum-soft`, `bg-tal-cream`, `bg-tal-cream-soft`, `border-tal-line`, `font-display`, `text-tal-plum` etc.

## 12. Git state at handover

```
main
79d07ee . ← latest pushed
7f7eb0b .
3610f1d .
4ea84e5 .
14b734b .
fbd7d1e first commit
8a70ee7 Initial commit from Create Next App
```

Uncommitted (working tree):
```
?? lifeadminorganiser/                              (PDFs — do not commit)
?? supabase/migrations/002_subcategories.sql        (ready to commit)
?? supabase/migrations/003_records_files_subcategory.sql  (ready to commit)
```

The `lifeadminorganiser/` folder should stay local only (it's a spec source, not shippable). Consider adding it to `.gitignore` before next commit. The two SQL files ARE meant to be committed.

## 13. How to resume in the next session

Say something like:

> Read docs/HANDOVER.md — that's where we left off. I've now run the 002 and 003 migrations in Supabase. Proceed with tasks 15–19 (subcategory data layer + API + UI), commit in one batch.

Or if you want to change direction, that doc gives Claude a fast on-ramp regardless.
