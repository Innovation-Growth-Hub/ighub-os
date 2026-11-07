# IGHubOs: Backend Architecture

**Status:** Decided · **Stack:** NestJS 12 (ESM) · Drizzle ORM · MySQL 8 · Better Auth · **Companion docs:** [AUTH-ARCHITECTURE.md](AUTH-ARCHITECTURE.md), [ROADMAP.md](ROADMAP.md)

> Library APIs named here (Better Auth, `nestjs-zod`, Drizzle) match their docs as of writing. Re-check signatures when you start Phase 3.

## 1. The decision

**A standalone NestJS 12 API (TypeScript, ESM, Express 5 adapter), in one monorepo with the Next.js app, backed by MySQL 8 through Drizzle ORM. Better Auth runs inside the API.**

```
ighubos/                       pnpm workspaces + Turborepo
  apps/
    web/        Next.js 16: UI only, no database access
    api/        NestJS 12 on Node 22–24: Better Auth, business logic, jobs
  packages/
    db/         Drizzle schema (MySQL), migrations, seed
    shared/     zod schemas, domain types, roles & permission statements
    config/     shared tsconfig / eslint
```

### Why a separate API rather than putting everything in Next.js

The PRD already commits us to more than one client and to work that isn't page rendering:

| PRD requirement | Why it needs a real API |
|---|---|
| Mobile attendance app (roadmap) | Mobile calls the same endpoints and the same auth (Better Auth `bearer`) |
| Public API for third parties (PRD Phase 3) | A versioned, documented `/api/v1` is the product, not a side effect of pages |
| Weekly penalties, reminders, invoice chasers | Scheduled jobs belong in a long-running service, not request handlers |
| QR attendance at 9am peak | Hot endpoint we can rate-limit on its own |
| Multi-tenant / white-label later | Tenant scoping is enforced once, at the API |

Next.js stays a pure frontend. A bug there can't leak data, because it has no database credentials.

### Why each piece

| Choice | Why | Considered |
|---|---|---|
| **Node 22 LTS + TypeScript** | Same language and types end to end | – |
| **NestJS 12** | Modules, dependency injection, guards and interceptors give every one of the ~14 modules the same shape. Guards map directly onto our RBAC and approval rules (fund requests, PM task scope). Familiar structure for anyone coming from Laravel. Swagger built in | Hono (smaller and faster to start, but we'd hand-build the structure Nest gives us); Express/Fastify alone (same problem) |
| **MySQL 8** | Widely hosted (including Hostinger), InnoDB transactions, JSON columns, window functions; Better Auth + Drizzle support it fully | PostgreSQL |
| **Drizzle ORM** | Schema is TypeScript in `packages/db`, shared by API, seed and tests; queries read like SQL, which matters for finance and attendance reports; Better Auth's CLI generates its tables for Drizzle | Prisma (also fine with Nest; generated client and its own schema language); TypeORM (Nest's old default; decorators-on-entities and weaker typing, avoid) |
| **zod 4** (own `ZodPipe`) | One schema in `packages/shared` validates the request body in Nest, types the handler, and validates the same form in the browser. `nestjs-zod` doesn't support Nest 12 yet, so `apps/api/src/common/zod.pipe.ts` does it in ~20 lines | `class-validator` DTOs (Nest default, but can't be shared with the frontend) |

## 2. Request lifecycle

```
Browser ──► os.ighub.com.ng (Next.js)
              │  /api/*  is rewritten by Next.js to api.ighub.com.ng
              ▼
            NestJS app (Express adapter)
              ├─ helmet · Nest logger (JSON in production) · CORS off (same origin)
              ├─ /api/auth/*  ──► Better Auth handler (mounted before the body parser)
              └─ /api/v1/*
                   ├─ AuthGuard         (global) origin check → session → banned/coming-soon → password_change_required → @AllowRoles(policy)
                   ├─ ZodPipe           body (schemas from @ighub/shared)
                   ├─ controller        thin: calls the module's service
                   │     service        business rules + row rules (owner, assignee, PM's projects)
                   │     repository     Drizzle queries, transactions
                   └─ exception filter  RFC 9457 problem+json { type, title, status, detail }
```

**Rule:** controllers never touch the database, and repositories never make permission decisions. Each layer can be tested on its own.

### Mounting Better Auth in Nest

Better Auth needs the raw request body on its routes, so Nest's body parser must not run first:

```ts
// apps/api/src/bootstrap.ts (shared by main.ts and the e2e tests)
const app = await NestFactory.create(AppModule.register(env), { bodyParser: false });
const server = app.getHttpAdapter().getInstance();
server.all("/api/auth/{*any}", toNodeHandler(app.get(AUTH)));   // better-auth/node, Express 5 path syntax
app.use(express.json({ limit: "1mb" }));                          // everything else
app.setGlobalPrefix("api/v1");
```

We mount it by hand (not `@thallesp/nestjs-better-auth`) to keep one less dependency between us and Nest 12.

## 3. Inside `apps/api`

```
apps/api/src/
  main.ts                    bootstrap, Better Auth mount, graceful shutdown
  app.module.ts              imports every module below
  auth/                      auth.ts (Better Auth: drizzle adapter, admin plugin + access control, hooks),
                             auth.guard.ts, decorators (@Public, @AllowRoles, @AllowPendingPasswordChange, @CurrentUser)
  config/env.ts              zod-validated environment (refuses to boot misconfigured)
  common/                    problem+json filter, ZodPipe, AuditService; later: clock (Africa/Lagos), mailer, storage
  db/                        DbModule: mysql2 pool → `DB` provider, injected into repositories
  accounts/                  ✅ sprint 1: /me, list, create, update, deactivate, reset password
  health/                    ✅ sprint 1: GET /api/v1/health (DB ping)
  modules/
    staff/                   staff.module.ts · .controller.ts · .service.ts · .repository.ts · .service.spec.ts
    attendance/              QR verify, clock in/out, late requests, penalties
    tasks/                   includes the PM rule: assign only to people on your projects
    daily-logs/              one log per person per day; super admin reads all
    fund-requests/           submit → accountant review → super admin approval → disbursement
    projects/ crm/ lms/ finance/ documents/ meetings/ social/ reports/
  jobs/
    jobs.module.ts           standalone context for cron scripts
    weekly-penalties.ts  clock-out-reminders.ts  daily-log-reminders.ts  overdue-invoices.ts  session-cleanup.ts
```

One module per PRD feature, matching the frontend's routes, so a feature is one folder on each side.

### Rules that live in services (not just the UI)

| Module | Rule |
|---|---|
| `staff` | Only the super admin creates accounts, sets roles, deactivates (bans) or resets passwords |
| `tasks` | Staff change status only on tasks assigned to them. PMs create, assign and delete only on projects they manage, and only to people on those projects |
| `daily-logs` | Write your own log for today only. Super admin reads everyone's; nobody else reads other people's |
| `fund-requests` | Accountant forwards or rejects; may approve alone below ₦50,000. Super admin approves or rejects. Accountant disburses, which writes a finance expense in the same transaction. Nobody reviews their own request |
| `finance` | Super admin and accountant record; admin views |
| `meetings` | Admins and PMs schedule; everyone else sees meetings they're invited to |

These are the same rules as `src/lib/fund-requests.ts`, `src/lib/access.ts` and `src/lib/auth/roles.ts` in today's mock. They move to `packages/shared` so the browser and the API run one copy.

## 4. Data (MySQL)

- **Engine/charset:** InnoDB, `utf8mb4` / `utf8mb4_0900_ai_ci` (names with diacritics, emoji in social posts).
- **IDs:** Better Auth's string IDs for auth tables. Domain tables use the same (`varchar(36)`, generated in the app) so IDs are safe to expose.
- **Time:** store `DATETIME(3)` in **UTC**. Business rules use **Africa/Lagos** in one place (`common/clock.ts`): "late after 09:00", "week = Mon–Fri" and "today's daily log" are computed server-side, never from the client's clock.
- **Money:** `DECIMAL(14,2)` in naira, never floats.
- **Soft delete** (`deletedAt`) on staff, projects, documents; hard delete elsewhere.
- **Migrations:** `drizzle-kit generate` → reviewed SQL files committed → `drizzle-kit migrate` in CI/deploy. Never `push` in production.
- **Seed:** port `src/lib/mock/seed.ts` into `packages/db/seed.ts`, so staging has the same demo accounts and numbers the UI was designed against.
- **Audit log:** `audit_log` table written by a Nest interceptor + Better Auth `databaseHooks`. Fund request decisions are also kept on the request (`fund_request_events`).

New tables beyond the PRD §8 list: `daily_logs` + `daily_log_entries`, `fund_requests` + `fund_request_events` + `fund_request_attachments`.

## 5. Cross-cutting services

| Concern | v1 choice | Notes |
|---|---|---|
| Email | Nodemailer over SMTP (Hostinger mailbox) behind a `MailerService` | v1 sends only reminders; login details are shared by the super admin by hand |
| Files | `StorageService`: local disk outside any public folder; S3-compatible (R2) later | Documents, quotes and receipts. Upload via the API with size/type limits; served only through authorized routes |
| Jobs | hPanel cron runs `node dist/jobs/<job>.js` (Nest application context, no HTTP) + MySQL `GET_LOCK` | `@nestjs/schedule` only for local dev |
| Rate limiting | Better Auth limiter for auth routes (5 sign-ins/min); `/api/v1` limits later | Memory storage is fine for one instance |
| Logs / errors | Nest `ConsoleLogger` (JSON in production); Sentry for API and web later | Add pino if we need request ids |
| Config | `env.ts` validates every variable with zod at boot | The app refuses to start misconfigured |
| API docs | `/api/v1/openapi.json` from the zod schemas (zod 4 `toJSONSchema`), added in sprint 2 | Source for the typed frontend client |

## 6. How the frontend talks to it

1. `packages/shared` holds the zod schemas → the API serves `/api/v1/openapi.json`.
2. `apps/web` generates a typed client (`openapi-typescript` + `openapi-fetch`).
3. **TanStack Query** hooks per module (`useTasks()`, `useMoveTask()`) replace today's Zustand `useDb` actions. Components barely change, because the hooks return the same shapes.
4. **Migrate one module at a time:** a `dataSource` switch per module (`mock` | `api`) lets attendance go live while finance is still on mock data.
5. Server Components read the session through `lib/dal.ts` (see the auth doc §7); data pages stay client-side with TanStack Query for now.

## 7. Quality gates

| Gate | Tooling |
|---|---|
| Unit tests (services, permission matrix, fund request transitions, penalty math, lateness in Lagos time) | Vitest 4 (Nest 12 default) |
| Integration tests against real MySQL | Vitest + Supertest against a local `ighubos_test` database (wiped and migrated per run); Testcontainers in CI |
| API contract | OpenAPI diff in CI: breaking changes fail the build |
| E2E per role | Playwright against staging |
| CI on every PR | typecheck · lint · test · build · migration dry-run |

## 8. Environments & hosting: Hostinger Cloud

**Plan:** Hostinger Cloud hosting (4 vCPU, 4 GB RAM, 200 GB disk, Node.js 18–24, npm/pnpm). It is managed hosting: no root, no Docker, no Nginx config. So each app runs as a **Hostinger Node.js web app on its own subdomain**, and MySQL comes from hPanel → Databases. NestJS runs as a plain Node process (`node dist/main.js`), so it needs nothing special.

```
os.ighub.com.ng      Hostinger Node app: apps/web   (next start)
                       └─ next.config rewrites /api/*  →  https://api.ighub.com.ng/api/*
api.ighub.com.ng     Hostinger Node app: apps/api   (node dist/main.js)
                       └─ MySQL (hPanel database, localhost)  ·  uploads dir outside public_html
hPanel cron          node dist/jobs/<job>.js   (weekly penalties, reminders, cleanup)
ighub.com.ng         unchanged (existing public website)
```

| Concern | How on Hostinger Cloud |
|---|---|
| Cookies | The browser only talks to `os.ighub.com.ng`; `/api/*` is rewritten server-side to the API, so auth cookies stay first-party. No CORS, no cross-subdomain cookie setup |
| TLS | Enable free SSL on both subdomains in hPanel and force HTTPS (Better Auth sets `Secure` cookies) |
| Database | hPanel MySQL database + user, connected over localhost. Staging gets its own database |
| Jobs | hPanel cron runs job scripts as commands, not HTTP endpoints, so nothing is exposed. Managed Node apps may be restarted or idled, so in-process scheduling is not relied on. Jobs still take a MySQL `GET_LOCK` |
| Builds | **Build in GitHub Actions, not on the server** (a Next.js build can use most of 4 GB RAM). CI uploads the built app over SSH and restarts it |
| Email | Hostinger mailbox SMTP (`smtp.hostinger.com`), e.g. `no-reply@ighub.com.ng` |
| Files | Local disk under the API app, outside any public folder; served only through authorized API routes |
| Backups | Hostinger automatic backups **plus** a nightly `mysqldump` cron copied offsite (e.g. R2 or Google Drive) |
| Environments | `os.` / `api.` for production; `staging-os.` / `staging-api.` with a separate database |
| Local dev | Local MySQL 8 service (no Docker needed); `pnpm dev` runs web + api + package watchers |

**Capacity:** a Nest API idles at roughly 100–150 MB. **Node:** Hostinger runs Node 18–24, so production targets Node 22 or 24 (`engines: >=22.12`, needed for Better Auth + Nest 12 ESM). 4 GB RAM covers web, API and MySQL for a hub-sized team. Watch memory after launch.

**When to move to a VPS:** if we need Redis, WebSockets at scale, more than one API instance, or root-level control. The code doesn't change; only the deploy target does.

### Verify in hPanel before Phase 3

1. **Node.js apps:** can we run two Node apps (web + API) on subdomains, and can each deploy from a build folder or a repo subdirectory?
2. **MySQL version:** MySQL 8 or MariaDB? Both work with Drizzle and Better Auth. MariaDB needs Drizzle's `mode: "default"` and a migration test.
3. **SSH access** is enabled (for CI deploys and running migrations).
4. **Cron jobs** can run `node` commands in the app directory.
5. **Long-running processes:** do Node apps stay up, or idle when there's no traffic?

## 9. Delivery plan (replaces Roadmap Phase 3 detail)

| Step | What | Output |
|---|---|---|
| 0 ✅ | **Monorepo move** (can start now, no backend needed): today's app → `apps/web`, create `packages/shared` from `lib/types.ts`, `roles.ts`, `access.ts`, `fund-requests.ts` | Web app runs unchanged from the new path |
| 1 ✅ | `packages/db`: MySQL schema for auth + audit log; seed (attendance tables come with step 4) | `pnpm db:migrate && pnpm db:seed` works locally |
| 2 | `apps/api` skeleton: env, logger, problem+json filter, DbModule, Better Auth (email/password + admin plugin), guards, accounts | ✅ Sprint 1. Sign-in returns a session cookie; e2e covers the account lifecycle |
| 3 | Frontend auth switch-over (auth doc §9) | Every live role logs in for real; first-login password change works |
| 4 | Staff + attendance + daily logs on the API (QR signing, Lagos-time lateness, penalties job) | The daily-use modules are live end to end |
| 5 | Tasks, fund requests + finance, then the remaining modules, one per PR, behind the `dataSource` switch | Mock store deleted |

## 10. Still open

| Question | Why it matters |
|---|---|
| hPanel checks in §8 | Confirms the deploy pipeline and the MySQL flavour |
| Solo developer for Phase 3 | The roadmap assumed 2–3 developers. Either the dates stretch or the scope of Phases 4–5 shrinks |
| Will we have more than one API instance in year one? | If yes, add Redis earlier (sessions cache, rate limits, BullMQ) |
