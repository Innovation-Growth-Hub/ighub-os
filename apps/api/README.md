# @ighub/api

NestJS 12 (ESM) + Better Auth + Drizzle on MySQL 8. Design: [docs/BACKEND-ARCHITECTURE.md](../../docs/BACKEND-ARCHITECTURE.md), [docs/AUTH-ARCHITECTURE.md](../../docs/AUTH-ARCHITECTURE.md).

## First-time setup

1. **Databases.** Open [packages/db/sql/create-local-databases.sql](../../packages/db/sql/create-local-databases.sql) in MySQL Workbench as root, replace `CHANGE_ME` with a password, and run it. It creates `ighubos_dev`, `ighubos_test` and an `ighubos` user.
2. **Environment.** Copy `.env.example` to `.env` in this folder. Put the password into both database URLs, and set `BETTER_AUTH_SECRET`:
   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
3. **Install, migrate, seed** (from the repo root):
   ```sh
   pnpm install
   pnpm build          # builds @ighub/shared and @ighub/db first
   pnpm db:migrate
   pnpm db:seed        # demo accounts, password "password"
   ```

## Run

```sh
pnpm dev            # from the repo root: web on :3000, API on :4000, package watchers
```

The web app rewrites `/api/auth/*` and `/api/v1/*` to the API, so cookies are first-party on `localhost:3000`.

## Test

```sh
pnpm --filter @ighub/api test       # unit tests
pnpm --filter @ighub/api test:e2e   # full account lifecycle against ighubos_test (wiped each run)
```

## Try it with curl

```sh
# Sign in as the super admin (cookie saved to jar.txt)
curl -c jar.txt -H "Origin: http://localhost:3000" -H "Content-Type: application/json" \
  -d '{"email":"superadmin@ighub.com","password":"password"}' http://localhost:4000/api/auth/sign-in/email

curl -b jar.txt http://localhost:4000/api/v1/me

# Create an account: the response holds the temporary password, shown once
curl -b jar.txt -H "Origin: http://localhost:3000" -H "Content-Type: application/json" \
  -d '{"name":"Ada Obi","email":"ada@ighub.com","role":"staff","position":"Designer","staffType":"intern","officeLocation":"aba_hub"}' \
  http://localhost:4000/api/v1/accounts
```

## Endpoints (sprint 1)

| Method | Path | Who |
|---|---|---|
| GET | `/api/v1/health` | public |
| GET | `/api/v1/me` | any signed-in user (even before the first-login password change) |
| GET | `/api/v1/accounts`, `/api/v1/accounts/:id` | super admin, admin |
| POST | `/api/v1/accounts` → `{ account, temporaryPassword }` | super admin |
| PATCH | `/api/v1/accounts/:id` | super admin |
| PATCH | `/api/v1/accounts/:id/status` `{ active }` | super admin (not on yourself) |
| POST | `/api/v1/accounts/:id/reset-password` → `{ temporaryPassword }` | super admin |
| * | `/api/auth/*` | Better Auth: `sign-in/email`, `sign-out`, `get-session`, `change-password`, admin endpoints |

Errors are RFC 9457 `application/problem+json` with a stable `code` (e.g. `password_change_required`, `validation_failed`).
