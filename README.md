# IGHUB OS

Operations platform for Innovation Growth Hub Abia: staff, QR attendance, tasks, projects, CRM, learning, finance, documents, meetings and social media.

**Current stage:** frontend only, on mock data (no backend yet). See [docs/ROADMAP.md](docs/ROADMAP.md) for the timeline and [prd.md](prd.md) for requirements.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Log in with any demo account (password `password`) or pick a role on the login screen:

| Role | Email |
|---|---|
| Super Admin | superadmin@ighub.com |
| Admin | admin@ighub.com |
| Staff | staff@ighub.com |
| Project Manager | pm@ighub.com |
| Trainer | trainer@ighub.com |
| Student | student@ighub.com |
| Social Media Manager | social@ighub.com |
| Client | client@partner.com |

Data lives in your browser's localStorage. Admins can restore it under **Settings → Account → Reset demo data**.

## Structure

```
src/
  proxy.ts                 optimistic auth redirect (cookie check)
  app/(auth)/              login, register
  app/(app)/               authenticated routes (one folder per module)
  components/ui/           design-system primitives (Button, Card, Badge, Modal, Table…)
  components/charts/       ColumnChart, BarList, Heatmap
  components/layout/       AppShell, Sidebar, Topbar, nav config
  lib/types.ts             domain types (the future API contract)
  lib/mock/seed.ts         deterministic seed data
  lib/store.ts             Zustand store: collections + actions (becomes API calls)
  lib/auth/auth-client.ts  mock auth shaped like Better Auth's client
  lib/auth/roles.ts        roles + route access table
```

## Swapping in the backend

- **Auth:** replace the body of `lib/auth/auth-client.ts` with `createAuthClient()` from `better-auth/react`, and in `proxy.ts` use `getSessionCookie()`.
- **Data:** replace `useDb` actions with API calls (TanStack Query), keeping the same shapes from `lib/types.ts`.
- **Access:** enforce `ROUTE_ACCESS` and the row rules in `lib/access.ts` on the server.

## Design rules

Flat "Minimalist Duolingo" style: no borders, no shadows, no dividers. Group things with padding and background contrast. Primary `#58CC02` (green *text* uses `#2F7A00` for contrast), mint `#D7FFB8`, surfaces `#F7F7F7`/`#F3F3F3`, pill buttons, `rounded-3xl` cards. Tokens are in `src/app/globals.css`.
