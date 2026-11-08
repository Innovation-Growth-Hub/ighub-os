# IGHubOs: Authentication & Authorization Architecture

**Status:** Decided · **Target:** Roadmap Phase 3 (Jan 2027) · **Stack:** Next.js 16 · NestJS API · Better Auth · MySQL 8 (Drizzle) · see [BACKEND-ARCHITECTURE.md](BACKEND-ARCHITECTURE.md)

> Better Auth APIs named here (`admin` plugin, `createAccessControl`, `getSessionCookie`, `twoFactor`) match its current docs as of writing. Re-check signatures at implementation time.

---

## 1. Goals

1. **One source of truth.** Sessions, users and roles live in the Node API. The Next.js app never decides who someone is; it asks.
2. **Every request is authorized on the server.** The UI hides what you can't do; the API refuses it. (Today's `ROUTE_ACCESS` table only hides.)
3. **The super admin creates every account.** There is no public sign-up. The super admin sets a temporary password and shares it by hand; the user must change it on first login.
4. **No CORS, no tokens in JavaScript.** httpOnly cookies, same-origin requests.
5. **Swap, don't rewrite.** The mock layer (`auth-client.ts`, `roles.ts`, `proxy.ts`) already has Better Auth's shape, so moving to the real thing should change few files.

## 2. The big picture

```
 Browser
   │  (only ever talks to os.ighub.ng: same origin, first-party cookies)
   ▼
 ┌──────────────────────────── Next.js 16 (apps/web) ─────────────────────────────┐
 │ proxy.ts         optimistic: no session cookie → redirect /login                │
 │ Server Comps     lib/dal.ts getCurrentUser() → GET /api/auth/get-session        │
 │ Client Comps     authClient (better-auth/react) · TanStack Query → /api/v1/*    │
 │ next.config      rewrites: /api/auth/*  ──┐   /api/v1/*  ──┐                    │
 └───────────────────────────────────────────┼─────────────────┼───────────────────┘
                                             ▼                 ▼
 ┌──────────────────────────── NestJS API (apps/api) ─────────────────────────────┐
 │ /api/auth/*   → Better Auth handler (sign-in, sessions, admin, 2FA)             │
 │ /api/v1/*     → guards: session → permission → controller → service row rules   │
 │ jobs          weekly penalties, reminders, session cleanup                      │
 └──────────────────────────────────────┬──────────────────────────────────────────┘
                                        ▼
                        MySQL 8:    user · session · account · verification
                                    + domain tables (attendance, tasks, …)
                                    + audit_log
```

**Why the rewrite proxy:** the browser sees one origin, so cookies are first-party, there's no CORS setup, and `SameSite=Lax` just works. The API can live anywhere (a VPS, Docker host or managed Node host) and still be swapped without touching the frontend. A future mobile app talks to the API directly using Better Auth's `bearer` plugin.

## 3. Repository layout (recommended: monorepo)

```
ighubos/
  apps/
    web/            ← today's Next.js app, moved
    api/            ← NestJS + Better Auth + Drizzle
  packages/
    shared/         ← roles, permission statements, zod schemas, domain types
```

`packages/shared` matters most for auth: **the same permission table runs in the browser (to hide buttons) and in the API (to refuse requests)**, so they can never drift. pnpm workspaces + Turborepo.

## 4. Roles & permissions

### 4.1 Two layers

| Layer | Question it answers | Where |
|---|---|---|
| **Role permissions** (RBAC) | "Can a *trainer* create courses at all?" | Better Auth `admin` plugin + `createAccessControl`, defined in `packages/shared` |
| **Row rules** (ownership) | "Can *this* trainer edit *this* course?" | API service layer (e.g. `course.trainerId === user.id`) |

### 4.2 Permission statements (resource → actions)

Defined once with `createAccessControl`. Actions are kept coarse on purpose:

| Resource | Actions |
|---|---|
| `staff` | `view`, `create`, `update`, `deactivate` |
| `attendance` | `clock`, `view_own`, `view_all`, `manage_qr` |
| `late_request` | `create`, `review` |
| `penalty` | `view_own`, `view_all`, `waive` |
| `task` | `view_own`, `view_all`, `create`, `update_status`, `delete` |
| `project` | `view_assigned`, `view_all`, `create`, `update`, `view_financials` |
| `crm` | `view`, `manage` |
| `course` | `view_enrolled`, `view_all`, `manage`, `grade` |
| `finance` | `view`, `manage` |
| `document` | `view_shared`, `upload`, `manage` |
| `meeting` | `view_own`, `schedule`, `manage` |
| `social` | `view`, `schedule` |
| `report` | `view`, `export` |
| `user` / `session` | Better Auth built-ins (`create`, `set-role`, `ban`, `impersonate`, `revoke`…) |

### 4.3 Role → permission matrix

**Live at launch:** Super Admin, Admin, Project Manager, Accountant, Staff. **Coming soon** (no account creation, sign-in refused): Social Media Manager, Trainer, Student, Client. Their columns stay in the table so permissions are ready when they launch.

| | Super Admin | Admin | PM | Accountant | Staff | *Trainer* | *Social* | *Student* | *Client* |
|---|---|---|---|---|---|---|---|---|---|
| Accounts (create, role, ban, reset password) | **all** | view staff | – | – | – | – | – | – | – |
| Attendance | all | all | clock, own | clock, own | clock, own | clock, own | clock, own | – | – |
| Late requests | review | review | create | create | create | create | create | – | – |
| Tasks | all | all | create, assign, delete **on own projects, to own project team** | own, status | own, status | own, status | own, status | – | – |
| Daily logs | **read all (view only)** | write own | write own | write own | write own | write own | write own | – | – |
| Fund requests | approve, reject, disburse | create own | create own | review, approve **under ₦50k**, forward, reject, disburse; create own | create own | create own | create own | – | – |
| Finance | manage | **view** | – | manage | – | – | – | – | – |
| Projects | all + $ | all + $ | create, update, $ | assigned | assigned | – | – | – | assigned (own client) |
| Meetings | schedule | schedule | schedule | invited | invited | invited | invited | – | – |
| CRM | manage | manage | manage | – | – | – | – | – | – |
| Courses | all | all | – | – | – | manage, grade | – | enrolled | – |
| Documents | manage | manage | upload | upload | upload | upload | upload | – | shared only |
| Social | schedule | schedule | – | – | – | – | schedule | – | – |
| Reports | export | export | – | – | – | – | – | – | – |

*Nobody reviews their own fund request. Only a super admin can create or promote another super admin.*

### 4.4 What happens to today's code

- `roles.ts` `ROUTE_ACCESS` becomes **derived**: each route declares the permission it needs (`/finance` → `finance:view`), not a role list. Adding a role then never means editing routes.
- `canAccess()` keeps its signature but calls `checkRolePermission` under the hood, so the sidebar and route guard keep working.

## 5. Data model

Better Auth owns four tables. We extend `user` through `additionalFields` instead of a parallel profile table, so the session already carries what the UI needs.

| Table | Key columns | Notes |
|---|---|---|
| `user` | id, name, email, emailVerified, image, **role**, **banned**, banReason, banExpires | `role`/`banned` from the admin plugin |
| ↳ additional fields | `staffType`, `officeLocation`, `position`, `phone`, `company`, `mustChangePassword` | `input: false` for anything users must not set themselves (role, staffType, office) |
| `session` | id, token, userId, expiresAt, ipAddress, userAgent, impersonatedBy | one row per device |
| `account` | userId, providerId (`credential` / `google`), password hash | scrypt by default |
| `verification` | identifier, value, expiresAt | unused in v1 (no email flows); kept for a later email reset |
| `twoFactor` | userId, secret, backupCodes | `twoFactor` plugin |
| `audit_log` *(ours)* | actorId, action, targetId, ip, at, meta | written from Better Auth `databaseHooks` + API middleware |

`isActive` in today's mock maps to **`banned`**. Banning revokes every session immediately, which "deactivate" alone wouldn't.

## 6. Flows

### 6.1 Sign in
1. Form → `authClient.signIn.email({ email, password, rememberMe })` → `POST /api/auth/sign-in/email` (rewritten to the API).
2. API verifies the password, checks the user isn't banned, creates a `session` row and sets the `httpOnly` cookie.
3. **Admins with 2FA:** the response says `twoFactorRedirect` → `/login/verify` → TOTP or backup code.
4. Client navigates to `?next=` (same-origin paths only, already implemented) or `/dashboard`.

### 6.2 Account creation (super admin only)
1. The super admin fills in Staff → **Create account** (name, email, role, staff type, office) with a generated temporary password → `authClient.admin.createUser({ email, password, name, role, data })`.
2. API: the admin plugin checks `user:create` (super admin only) and refuses coming-soon roles. The user is created with `mustChangePassword = true` (an additional field, `input: false`).
3. The UI shows the login details **once**, with a copy button. The super admin sends them by hand (WhatsApp or in person). No email is sent.

### 6.3 First login: forced password change
1. Sign-in succeeds, and the session's user has `mustChangePassword = true`.
2. The app shell (and `lib/dal.ts` on the server) redirects every page to `/change-password` until it's done.
3. `/change-password` → `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })`. A Better Auth `after` hook on the change-password endpoint clears `mustChangePassword`.
4. **API enforcement:** `SessionGuard` answers every `/api/v1` request with `403 password_change_required` while the flag is set, so skipping the UI redirect doesn't help.

### 6.4 Forgot / reset password
There's no self-service email reset in v1. The user asks the super admin → staff profile → **Reset password** → `admin.setUserPassword` with a new temporary password, `mustChangePassword = true`, and all the user's sessions revoked (`admin.revokeUserSessions`). Then the 6.3 flow runs again.

*Later (optional):* once a Hostinger mailbox is wired up, add `requestPasswordReset` → email link → `/reset-password?token=`.

### 6.5 Role change & deactivation
`admin.setRole` / `admin.banUser`: the API writes the audit log, and banning revokes sessions. The affected user is bounced to `/login` on their next request.

### 6.6 Support impersonation (super admin only)
`admin.impersonateUser` starts a 1-hour session marked `impersonatedBy`. The topbar shows a persistent "Viewing as Emeka · Stop" banner, and every action is audit-logged under both ids.

### 6.7 Sign out
`authClient.signOut()` deletes the session row and clears the cookie. Settings → Security lists active sessions (device, IP, last seen) with "Sign out other devices" (`revokeOtherSessions`).

## 7. How each layer checks auth

| Layer | Check | Strength | Failure → |
|---|---|---|---|
| `proxy.ts` | `getSessionCookie(request)`: cookie exists | Optimistic only (no DB hit) | redirect `/login?next=` |
| Server Components | `getCurrentUser()` in `lib/dal.ts`: fetches `/api/auth/get-session` with forwarded cookies, using `'use cache: private'` behind `<Suspense>` (Next 16 pattern) | Real | `redirect('/login')` |
| Client UI | `authClient.useSession()` + `hasPermission()` to hide nav and buttons | Cosmetic | hidden / "No access" panel |
| **API middleware** | `auth.api.getSession({ headers })` → `requirePermission('finance','view')` | **Authoritative** | `401` / `403` |
| **API services** | row rules (assignee, owner, enrolment, client) | **Authoritative** | `404` (don't reveal existence) |

Rule of thumb: **anything below the API line is a convenience; only the API protects data.**

## 8. Security baseline

- **Cookies:** `httpOnly`, `Secure`, `SameSite=Lax`, prefixed `__Secure-` in production. A 7-day session refreshes daily, and "Remember me" off means a browser-session cookie.
- **CSRF:** Better Auth checks `Origin` against `trustedOrigins` (`https://os.ighub.ng`). The same-origin rewrite keeps this trivial.
- **Rate limits:** sign-in, sign-up and reset are limited by Better Auth's built-in limiter (backed by MySQL, or Redis if we add it, in production, not memory). Example: 5 sign-in attempts per minute per IP+email.
- **Passwords:** minimum 8 characters (generated temporary passwords are 15), checked against the leaked-password list (`haveIBeenPwned` plugin). Hashing is scrypt by default.
- **2FA:** required for `super_admin` and `admin`, optional for everyone else.
- **Secrets:** `BETTER_AUTH_SECRET` and the DB URL live only in the API's environment. The web app holds no auth secret at all.
- **Audit log:** sign-in success/failure, account created, role change, ban, impersonation, password reset, fund request decisions.
- **Attendance:** clock-in requires a session **and** a server-signed (HMAC) daily QR payload **and** a server-side timestamp. Lateness is never trusted from the client.

## 9. Frontend changes (when the API exists)

| File | Today (mock) | Becomes |
|---|---|---|
| `lib/auth/auth-client.ts` | Zustand mock with the same API | `createAuthClient({ plugins: [adminClient({ ac, roles }), twoFactorClient(), inferAdditionalFields()] })` |
| `proxy.ts` | checks `ighub.session_token` | `getSessionCookie(request)` from `better-auth/cookies` |
| `lib/auth/roles.ts` | role lists per route | moves to `packages/shared`; routes declare permissions |
| `lib/dal.ts` | – | **new**: `getCurrentUser()`, `requirePermission()` for Server Components |
| `components/layout/app-shell.tsx` | client-side guard from localStorage | same guard on the real `useSession()`, plus impersonation banner |
| `app/(auth)/…` | login, change-password (mock) | same pages on the real client, + `login/verify` (2FA) |
| `app/(app)/settings` | password change (mock) | real password change, 2FA setup, active sessions |
| `app/(app)/staff` | super admin creates accounts and resets passwords (mock) | same UI on `admin.createUser` / `admin.setUserPassword`; deactivate → ban |

## 10. Build order (Roadmap Phase 3: 4–29 Jan 2027)

| Week | Deliverable | Done when |
|---|---|---|
| 1 | Monorepo, MySQL, Drizzle, Better Auth with email/password + admin plugin; `packages/shared` permissions | `curl` sign-in returns a cookie, and `/api/auth/get-session` returns role |
| 2 | Next rewrites, real `authClient`, `proxy.ts`, `lib/dal.ts`; login/logout; seed the demo accounts | Every role can log in on staging, and the sidebar matches the matrix |
| 3 | Account creation, forced first-login password change, admin password reset, ban/role change, audit log | Super admin creates an account → user logs in → sets a password → reaches their dashboard |
| 4 | 2FA for admins, sessions list, impersonation, rate limits, auth e2e tests (Playwright) per role | Security checklist in §8 passes, and e2e tests are green in CI |

## 11. Decisions needed

| # | Question | Recommendation |
|---|---|---|
| 1 | Who can self-register? | **Decided:** nobody. The super admin creates every account and shares login details by hand. |
| 1a | API framework? | **Decided:** NestJS + Drizzle (BACKEND-ARCHITECTURE.md) |
| 2 | Monorepo or two repos? | Monorepo (shared permissions + types) |
| 3 | Does IGHub use Google Workspace? | If yes, add "Continue with Google" for staff, restricted to `@ighub.ng` |
| 4 | Mandatory 2FA for admins? | Yes |
| 5 | Hosting? | **Decided:** Hostinger Cloud: web on `os.ighub.ng`, API on `api.ighub.ng` (BACKEND-ARCHITECTURE.md §8) |
| 6 | Session length? | 7 days, sliding; 12 hours for admins |
