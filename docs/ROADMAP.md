# IGHUB OS: Product Development Timeline

**Stack:** Next.js 16 (App Router) · Better Auth · NestJS API · MySQL 8 (Drizzle). Details in [BACKEND-ARCHITECTURE.md](BACKEND-ARCHITECTURE.md)
**Approach:** UI first on mock data, then replace the mock layer module by module.
**Start:** Wed 4 Nov 2026 · **Target v1.0 launch:** Mon 12 Apr 2027 (~23 weeks)

> Assumes a small team (2–3 developers + 1 designer, part time). Pull dates in or push them out to match real capacity. Each phase ends with a demo to IGHub staff.

## At a glance

| # | Phase | Dates | Weeks | Outcome |
|---|---|---|---|---|
| 0 | Foundation | 4 – 6 Nov 2026 | 0.5 | ✅ Design system, app shell, mock auth, every module route on mock data |
| 1 | Core ops UI hardening | 9 Nov – 4 Dec | 4 | Staff, attendance, tasks and dashboard ready for user testing |
| 2 | Business modules UI | 7 Dec – 18 Dec | 2 | Projects, CRM, finance, documents and meetings complete on mock data |
| – | Holiday freeze | 21 Dec – 1 Jan | 2 | Bug fixes only. Kids Code Camp runs. |
| 3 | Backend foundation | 4 Jan – 29 Jan 2027 | 4 | NestJS API, MySQL, Better Auth + RBAC, first modules live |
| 4 | Integration | 1 Feb – 5 Mar | 5 | Every module on the real API; QR, uploads, email and jobs working |
| 5 | Intelligence & growth | 8 Mar – 26 Mar | 3 | LMS depth, social publishing, reports, AI insights |
| 6 | Hardening & pilot | 29 Mar – 9 Apr | 2 | QA, security, performance, staff pilot at Umuahia HQ |
| 🚀 | **v1.0 launch** | **12 Apr 2027** | | Both offices live |

---

## Phase 0: Foundation ✅ (done)

- Next.js 16 app with `cacheComponents` + Partial Prefetching; production build passes
- "Minimalist Duolingo" design system: flat surfaces, no borders or shadows, `#58CC02`, Plus Jakarta Sans, Lucide icons
- Mock auth shaped like Better Auth's client (`signIn.email`, `signOut`, `useSession`) plus a `proxy.ts` cookie gate
- Role-based navigation and route guard for 8 roles (`src/lib/auth/roles.ts`)
- Zustand store persisted to localStorage, with deterministic seed data matching the PRD figures
- Routes: dashboard (4 role variants), staff, attendance (overview, QR clock-in, office QR codes, late requests, penalties), tasks board, projects, CRM (contacts and pipeline), LMS, finance, documents, meetings, social, reports, AI insights (rule-based preview), settings

## Phase 1: Core ops UI hardening (9 Nov – 4 Dec)

The modules people will use every day get polished first.

- **Forms:** add `react-hook-form` + `zod` and put validation on every form. Share the zod schemas with the API later.
- **Attendance:** a real camera QR scanner (BarcodeDetector API with a zxing fallback), a geolocation prompt, and clock-out reminders
- **Tasks:** keyboard-accessible drag and drop (`dnd-kit`), task detail drawer, comments, filters by project, assignee and priority
- **Staff:** profile photo upload (mock), bulk import from CSV, penalty waiver flow
- **Dashboard:** working global search, notification centre
- **Quality:** Playwright smoke tests for each role, an accessibility pass (keyboard and screen reader), and a check on mobile at a 390px viewport
- **Exit criteria:** 5 IGHub staff complete clock-in → task update → late request without help

## Phase 2: Business modules UI (7 – 18 Dec)

- **Projects:** milestone editor, edit project, Gantt-style timeline view
- **CRM:** contact detail page, deal create/edit, segment tags
- **Finance:** invoice builder and PDF preview, payment tracking, date-range filters
- **Documents:** version history, folder view, previews
- **Meetings:** edit/reschedule, a week calendar view, ICS export
- **Freeze the API contract:** `src/lib/types.ts` becomes the OpenAPI/zod source of truth for Phase 3

## Phase 3: Backend foundation (4 – 29 Jan 2027)

- **Service:** NestJS API with Drizzle ORM on MySQL 8, in a monorepo with the web app. See [BACKEND-ARCHITECTURE.md](BACKEND-ARCHITECTURE.md).
- **Auth:** Better Auth server (email/password and sessions) with the `admin` plugin for roles. Swap `src/lib/auth/auth-client.ts` to `createAuthClient()` and `proxy.ts` to `getSessionCookie()`.
- **Authorization:** move the `ROUTE_ACCESS` table and the `visibleProjects`-style row rules to the API, and enforce them on every endpoint
- **Data layer in the app:** TanStack Query hooks that keep the shape of the current store selectors, so components barely change
- **First modules live:** users/staff, attendance and late requests (the highest-value data)
- **Infra:** Docker Compose for local development, staging environment, CI (lint, typecheck, test, build), database migrations and seeders ported from `src/lib/mock/seed.ts`

## Phase 4: Integration (1 Feb – 5 Mar)

- Remaining modules on the API: tasks, projects, CRM, LMS, finance, documents, meetings, social
- **Attendance security:** HMAC-signed daily QR payloads, server-side time, and office geofence checks
- **Jobs:** weekly penalty calculation (cron), clock-out reminders, overdue invoice reminders
- **Files:** presigned uploads to S3-compatible storage (Cloudflare R2 or S3)
- **Notifications:** transactional email (Resend or SES); SMS for Nigerian numbers through Termii if needed
- **Audit log:** who changed what. This replaces the mock activity feed.

## Phase 5: Intelligence & growth (8 – 26 Mar)

- **LMS:** lesson content (video and markdown), assignments, grading, certificates
- **Social:** connect platform APIs for scheduled publishing and analytics sync
- **Reports:** scheduled PDF/CSV reports by email, custom date ranges
- **AI Insights:** replace the rule engine with an LLM call (Claude API) over the aggregated metrics. Training-document analysis comes in this phase, as does the Google/Outlook calendar sync from PRD Phase 2.

## Phase 6: Hardening & pilot (29 Mar – 9 Apr)

- Load test attendance at 9am peak, Lighthouse ≥ 90, error monitoring (Sentry)
- Security review: auth flows, RBAC on every endpoint, rate limits, OWASP checklist
- Backups and restore drill (PRD §6.1), production checklist
- One-week pilot with the Umuahia HQ team → fixes → Aba Hub rollout

## After v1.0 (PRD Phases 2–4)

Mobile attendance app (React Native, reusing the API) · payroll & inventory · video conferencing · public API · multi-tenant / white-label for other hubs · multi-language

---

## Risks to watch

| Risk | Mitigation |
|---|---|
| QR codes shared over WhatsApp | Signed daily codes + geofence (Phase 4); rotate hourly if abuse appears |
| Unreliable power/internet at the offices | Offline-tolerant clock-in queue in the PWA (Phase 6) |
| Scope creep across 14 modules | Ship core ops first; anything not in Phases 1–4 waits for v1.1 |
| Mock UI drifts from the real API | Freeze `types.ts` → zod/OpenAPI contract at the end of Phase 2 |
