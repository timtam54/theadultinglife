# The Adulting Life — Phase 1 Build Conversation

_Transcript of the Claude Code session that scaffolded the Phase 1 build._
_Date: 2026-07-06_

---

## Initial spec (user)

> # The Adulting Life — PWA Build Spec (Phase 1: Foundation + 3 core sections)
>
> ## What we're building
> An installable Progressive Web App (PWA) called "The Adulting Life" — a life-admin
> organiser for young adults. This phase delivers the foundation plus the three core
> sections. Billing, analytics, and AI come in later phases (leave clean seams for them,
> but do not build them now).
>
> ## Stack (fixed — do not substitute)
> - Next.js (App Router) + TypeScript
> - API via Next.js route handlers only — NO separate backend service
> - Azure SQL (via Prisma or a thin query layer — see data layer rule below)
> - Azure Blob Storage for file uploads (secure, per-user access)
> - Tailwind CSS for styling
> - Auth: sign in with Google, Microsoft, and Apple (OAuth/OIDC) — no password accounts
> - Deployment target: Azure (App Service) or Vercel — keep build portable between them
> - PWA: installable, offline shell, service worker, responsive (mobile-first)
>
> ## Architecture rules (important)
> - Route handlers are thin. They handle request/response and auth only.
> - ALL business logic and data access live in `/lib/services/*` and `/lib/db/*`.
>   Route handlers call services; services call the db layer. Never let a route
>   handler query the database directly.
> - This keeps the option open to extract a standalone API later without a rewrite.
> - Every data query is scoped to the authenticated user. No cross-user access, ever.
>
> ## Auth
> - Social login only: Google, Microsoft, Apple.
> - Use a well-supported library (e.g. Auth.js / NextAuth) with those three providers.
> - Sessions via secure httpOnly cookies.
> - A logged-out user sees a clean login page; logged-in users land on the dashboard.
>
> ## App shell (after login)
> - Header with app name/logo and a nav menu to the three sections + dashboard.
> - Dashboard landing page: simple cards linking to each of the three sections.
> - Mobile-first, installable, works offline for already-loaded content.
>
> ## The three core sections
>
> ### 1. Life Administration Organisation
> - Five categories: Personal, Health, Education, Employment, Admin & Bookkeeping.
> - Within each category, the user creates/edits/deletes structured "records"
>   (e.g. a driver's licence record, a Medicare record, a vehicle record).
> - Each record: a title, a set of fields (text/date/number), and optional attached
>   documents (files live in section 2's storage).
> - Records with expiry dates (licence, passport, rego, insurance) support a reminder:
>   flag the record as it approaches expiry. States: Active → Expiring Soon → Expired.
> - Search and filter across all records within and across categories.
>
> ### 2. Secure Document & Information Storage
> - Upload documents and photos to Azure Blob (incl. capturing a photo from the device).
> - Files are attached to records (from section 1) OR stored standalone with tags.
> - View, download, replace, delete files.
> - All access is per-user and secured via short-lived SAS URLs — never public blobs.
> - Show simple storage usage (count / total size) per user.
>
> ### 3. Educational & Interactive Learning Tools
> - Display written educational content, organised by the five sections above.
>   (Content is supplied as structured data/markdown — build it to render from a
>   content source, not hard-coded copy.)
> - A downloadable guides/forms library (list + download).
> - Interactive quizzes: multiple-choice questions grouped by section, with scoring
>   and a shown result. (Question bank supplied as structured data.)
> - Track per-user progress: which sections read, quiz scores, completion.
>
> ## Data model (starting point — refine as needed)
> - User (from auth provider)
> - Category (the five fixed categories)
> - Record (belongs to User + Category; has fields; optional expiry date + status)
> - FileObject (belongs to User; optional link to Record; blob reference, metadata)
> - ContentItem (educational content, keyed by section)
> - Quiz / Question / Answer / QuizResult (belongs to User)
> - ProgressItem (per-user progress tracking)
>
> ## Explicitly NOT in this phase (leave clean seams, don't build)
> - Subscriptions/billing (Square) — later
> - Usage analytics dashboard — later
> - AI feedback / speech-to-text — later
> - Domestic Violence section — separate future module, do not scaffold
> - Native/Capacitor packaging — not doing this at all; PWA only
>
> ## Deliverable for the first push
> 1. Running Next.js PWA that installs on a phone.
> 2. Working Google/Microsoft/Apple login → dashboard.
> 3. Azure SQL connected, schema migrated, data layer in place.
> 4. The three sections visible and navigable (real for section 1 CRUD;
>    sections 2 and 3 can start as working scaffolds wired to the data layer).
> 5. Deployable to Azure or Vercel.
>
> ## Auth (revised)
> - Sign-in options: Google, Microsoft, Apple (OAuth/OIDC) AND username/password.
> - IMPORTANT: An existing Next.js project at /documents/moodkin already implements
>   this auth pattern (OAuth providers + credentials stored in a DB table). READ that
>   project's auth implementation first and replicate the same approach here — same
>   library, same structure, same session strategy — adapted to this app's schema.
>   Do not invent a new auth design; match Moodkin.
> - Username/password: passwords hashed with bcrypt or argon2 (never plaintext),
>   stored in a Users credentials table. Include password reset and basic
>   login rate-limiting. Follow whatever Moodkin already does here.
> - Sessions via secure httpOnly cookies.
> - Logged-out users see a clean login page (social buttons + email/password form);
>   logged-in users land on the dashboard.
>
> ## Hosting / infrastructure
> - Database: Azure SQL (already provisioned). Prefer this over Supabase.
> - App hosting: Azure (App Service), same region as the Azure SQL instance —
>   keep app and DB in the same cloud to minimise latency.
> - Keep the build portable (no hard Azure-only lock-in) so it could move to Vercel
>   later if desired, but target Azure for launch.

---

## Assistant — initial investigation

Explored the repo (fresh Next.js 16.2.10 + React 19 project) and dispatched two parallel research agents:

1. **Study Moodkin's auth implementation** at `/Users/timhams/Documents/moodkin` so we could replicate it.
2. **Read Next.js 16 docs** at `node_modules/next/dist/docs/` to catch breaking changes.

### Key findings

**Moodkin auth pattern:**
- Custom implementation (NOT NextAuth). Uses `bcryptjs`, `jose`, `nodemailer`, `@supabase/supabase-js`.
- Manual OAuth flows for Google, Microsoft, Apple (Apple needs JWT client secret + POST callback).
- Session = base64-encoded JSON `{ userId, expiresAt }` in httpOnly cookie `moodkin_session`, 30-day TTL.
- Password: bcrypt (12 rounds), 10-char min, letters+numbers required, SHA-256 token hashes stored in DB, `timingSafeEqual` compare.
- Rate limiting: in-memory, per-IP + per-account.
- All auth state in single `users` table (no separate Account/Session tables).
- No `middleware.ts` — route protection is inline `requireSession()` per handler.

**Next.js 16 breaking changes to watch:**
- `cookies()` and `headers()` are now **async** — must `await`.
- `params` and `searchParams` are now `Promise<...>` — must `await` (or `use()` in client).
- Route handler `params` also promise-wrapped.
- PWA has first-class `app/manifest.ts` support; service worker is BYO.
- `fetch()` cache default depends on `cacheComponents` opt-in.

### Two clarifying questions asked

1. DB layer — Prisma vs raw SQL vs Drizzle against Azure SQL?
2. Do you have Supabase / OAuth / storage credentials ready?

---

## User

> ok change in plan - lets go supbase / vercel

## Assistant

Switched stack:
- **DB:** Supabase (Postgres) — replaces Azure SQL
- **File storage:** Supabase Storage — replaces Azure Blob (signed URLs instead of SAS URLs)
- **Hosting:** Vercel — replaces Azure App Service
- **Auth:** Custom (bcrypt + jose), Google/Microsoft/Apple + email+password — copy Moodkin's pattern
- **Framework:** Next.js 16 App Router + TS + Tailwind + PWA (`app/manifest.ts` + BYO service worker)

Asked follow-up questions about credentials readiness and how closely to mirror Moodkin.

---

## User

> how do i set up supbase now

## Assistant — Supabase setup guide

1. **Create the project** at supabase.com — pick region closest to users, save DB password.
2. **Grab three keys** from Settings → API:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role/secret key → `SUPABASE_SERVICE_ROLE_KEY` (server-only)
3. **Enable Storage** → new bucket `user-files`, **public OFF**.
4. Optional: install Supabase CLI (`brew install supabase/tap/supabase`) for migrations.

User shared screenshot of Supabase API Keys page (new `sb_publishable_...` / `sb_secret_...` format).

Explained the key mapping to old anon/service-role terminology.

---

## User (with project settings screenshot)

> in settings general - Project Settings ... theadultinglife ... ykkshsxsqykskbovusvu Project ID ... ap-northeast-1 Project region Northeast Asia (Tokyo)

## Assistant

Constructed Project URL from ID: `https://ykkshsxsqykskbovusvu.supabase.co`

Explained the "no project url" concern (Supabase renamed / relocated it — it's derivable from project ID). Also flagged the alternate places it's shown labelled (Settings → Data API, or Home).

Verified `.env.local` is gitignored via `.gitignore` line 34 (`.env*`).

---

## User

> ok supbase set up proceed

## Assistant — clarifying decisions

Asked three multi-choice questions to lock in the remaining scaffold decisions:

- **OAuth apps:** Scaffold with stubs (email/password works today, OAuth buttons stubbed until creds arrive).
- **Login UI:** Mirror Moodkin functionality/layout, restyled with brand from theadultinglife.com.au and `public/Logo.png`.
- **Email sender:** Stub for now (reset links log to server console).

Fetched brand palette from theadultinglife.com.au (WebFetch temporarily overloaded; recovered via `curl` + grep).

### Brand palette extracted from live site CSS

- **Accent / primary:** `#4c373c` — deep warm plum/burgundy-brown
- **Deep dark:** `#23191b`
- **Cream/warm bg:** `#ffe7ce`
- **Fonts:** Headings **Poppins**, body **Source Sans Pro**
- **Logo:** black-on-white script wordmark at `public/Logo.png`

---

## Assistant — Phase 1 build execution

Task list created and worked through:

1. ✅ Fetch brand palette from theadultinglife.com.au
2. ✅ Install core dependencies (`@supabase/supabase-js`, `@supabase/ssr`, `bcryptjs`, `jose`, `nodemailer`, `@types/bcryptjs`, `@types/nodemailer`)
3. ✅ Configure Next.js 16 + Tailwind + PWA basics
4. ✅ Add SQL schema + seed migration (Supabase)
5. ✅ Build Supabase client + db layer
6. ✅ Build auth layer (mirror Moodkin)
7. ✅ Auth API routes
8. ✅ Login page + set-password page
9. ✅ App shell + dashboard
10. ✅ Section 1: Life Admin — records CRUD
11. ✅ Section 2: Secure Storage scaffold
12. ✅ Section 3: Learning tools scaffold
13. ✅ Smoke test + build verification

### Files written / modified

**Foundation**
- `app/layout.tsx` — root layout with Poppins + Source Sans fonts, brand colours, PWA metadata
- `app/globals.css` — Tailwind v4 `@theme` mapping for `--tal-plum`, `--tal-cream`, etc.
- `app/manifest.ts` — PWA manifest (`display: standalone`, theme colour `#4c373c`)
- `app/page.tsx` — root landing, redirects `/dashboard` or `/login` based on session
- `app/offline/page.tsx` — offline shell fallback
- `public/sw.js` — minimal service worker (cache app shell, offline fallback)
- `components/RegisterSW.tsx` — registers SW in production only
- `components/BrandLogo.tsx` — `<Image>` wrapper for `Logo.png`
- `components/StatusPill.tsx` — Active / Expiring soon / Expired badge

**Auth**
- `lib/auth/session.ts` — `createSession`, `getSession`, `requireSession`, `destroySession`, `UnauthorizedError`. Cookie `adultinglife_session`, base64 JSON, 30-day TTL.
- `lib/auth/password.ts` — bcrypt hash/verify, `generateSetupToken`, SHA-256 hashing, `safeTokenMatch`, `validatePasswordStrength`.
- `lib/auth/password-email.ts` — sends via Gmail SMTP if configured, otherwise logs link to console.
- `lib/auth/rate-limit.ts` — in-memory per-key limiter + `clientIp`.
- `lib/auth/oauth-config.ts` — reads OAuth env vars; returns null if any provider isn't configured.
- `lib/auth/oauth-state.ts` — CSRF state cookie per provider.
- `lib/auth/oauth-service.ts` — `upsertOAuthUser` (creates or links).
- `lib/auth/google.ts`, `microsoft.ts`, `apple.ts` — provider URL builders + code-exchange.

**API routes**
- `app/api/auth/session/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/password/login/route.ts`
- `app/api/auth/password/request/route.ts`
- `app/api/auth/password/check-token/route.ts`
- `app/api/auth/password/set/route.ts`
- `app/api/auth/{google,microsoft,apple}/route.ts` — initiators
- `app/api/auth/{google,microsoft}/callback/route.ts` — GET callbacks
- `app/api/auth/apple/callback/route.ts` — POST callback with 303 redirect (Apple quirk)
- `app/api/records/route.ts` — GET (list), POST (create)
- `app/api/records/[id]/route.ts` — GET, PATCH, DELETE
- `app/api/files/route.ts` — GET (list), POST (upload multipart)
- `app/api/files/[id]/route.ts` — GET (signed URL), DELETE
- `app/api/progress/route.ts` — GET, POST upsert
- `app/api/quizzes/[id]/submit/route.ts` — scores quiz + records result + upserts progress

**DB layer**
- `lib/supabase/server.ts` — cached service-role client
- `lib/supabase/storage.ts` — signed URL, upload, delete, `userFilePath`
- `lib/db/types.ts` — `CategoryId`, `RecordRow`, `FileRow`, `UserRow`, etc.
- `lib/db/users.ts` — `findUserByEmail`, `findUserById`, `findUserByPasswordTokenHash`, `createUser`, `updateUser`
- `lib/db/records.ts` — list/get/create/update/delete
- `lib/db/files.ts` — list/get/insert/delete + `storageUsage`
- `lib/db/progress.ts` — `upsertProgress`, `listProgress`, `recordQuizResult`, `latestQuizResult`

**Services**
- `lib/services/records.ts` — `computeStatus` (Active/Expiring Soon/Expired at 30 days), `isCategoryId` guard, field normalisation, all CRUD entry points
- `lib/services/files.ts` — `uploadForUser` (path + upload + row), `getSignedDownload`, `removeUserFile`, `usageForUser`

**App shell + pages**
- `app/(app)/layout.tsx` — protected layout with header, nav, sign-out
- `app/(app)/dashboard/page.tsx` — welcome + 3 cards
- `app/(app)/records/page.tsx` — categories index + expiring-soon banner
- `app/(app)/records/search/page.tsx` — cross-category search
- `app/(app)/records/[category]/page.tsx` — records list per category
- `app/(app)/records/[category]/new/page.tsx` — create record
- `app/(app)/records/[category]/[id]/page.tsx` — edit record
- `components/RecordEditor.tsx` — dynamic fields, expiry, notes, submit + delete
- `app/(app)/files/page.tsx` — usage header + client component
- `components/FilesClient.tsx` — upload / capture photo / list / download / delete
- `app/(app)/learn/page.tsx` — categories with content/guide/quiz counts
- `app/(app)/learn/[category]/page.tsx` — articles + guides + quizzes for a category
- `app/(app)/learn/[category]/article/[id]/page.tsx` — article renderer
- `components/MarkContentRead.tsx` — client effect posts progress on mount
- `app/(app)/learn/[category]/quiz/[id]/page.tsx` — quiz page
- `components/QuizRunner.tsx` — client radio form + submit + result
- `content/learning.ts` — seeded articles, guides, quizzes (structured data)

**Auth pages**
- `app/login/page.tsx` — mirrors Moodkin flow: oauth → email → check-email → provider-conflict modes
- `app/set-password/page.tsx` — token check + password form

**Database migration**
- `supabase/migrations/001_init.sql` — creates `users`, `categories` (with seed of 5), `records`, `file_objects`, `content_items`, `quizzes`, `questions`, `quiz_results`, `progress_items`. RLS enabled (service role bypasses; anon/authenticated get no policies → no direct access).

**Env**
- `.env.example` — documents all required and optional env vars

### Verification

- `npx tsc --noEmit` — clean, no errors
- `npm run build` — successful, all 28 pages generated
- `curl` smoke tests against running dev server:
  - `/` → 307 → `/login` (correct: no session)
  - `/login` → 200, HTML contains `The Adulting Life`, `Welcome`, `Continue with Google/Microsoft/Apple`, `Logo.png`, `tal-plum` classes
  - `/manifest.webmanifest` → 200, correct name/colours/icons
  - `/api/records`, `/api/files`, `/api/progress` → 401 unauthorized (correct)

---

## Handoff to user

**Next steps required from user:**

1. **Run the migration in Supabase** — paste `supabase/migrations/001_init.sql` into the SQL editor.
2. **Create the storage bucket** `user-files` (public OFF) — already covered in setup guide.
3. **Test the login flow locally:** visit `/login` → "Continue with email" → any email → leave password blank → check terminal for setup link → paste into browser → set a password → land on `/dashboard`.
4. **When ready**, add OAuth creds and `EMAIL_USER`/`EMAIL_PASSWORD` per `.env.example`.

Nothing was committed to git — files are written and the dev server on `localhost:3000` is already picking them up.

---

_End of transcript._
