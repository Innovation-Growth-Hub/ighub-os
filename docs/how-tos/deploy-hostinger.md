# Deploy IGHubOs to Hostinger Cloud

Two Node.js apps on two subdomains, one MySQL database:

| Subdomain | Package | Start command | Node |
|---|---|---|---|
| `os.ighub.ng` | `deploy/ighubos-web.zip` | `node apps/web/server.js` | 22 or 24 |
| `api.ighub.ng` | `deploy/ighubos-api.zip` | `node main.mjs` | 22 or 24 |

Both packages are self-contained: **don't run `npm install` on the server.** If hPanel insists on an install step, leave it empty or point it at `node --version`.

> hPanel menu names change from time to time. If a step below doesn't match what you see, follow the closest option and note it here.

## 1. Build the packages (on your PC)

From the repo root:

```sh
pnpm install
pnpm package:deploy            # API origin defaults to https://api.ighub.ng
```

That produces `deploy/ighubos-web.zip` and `deploy/ighubos-api.zip`. Rebuild the **web** package whenever the API address changes: it's baked in at build time.

## 2. Database (hPanel → Databases → MySQL)

1. Create a database (e.g. `u123_ighubos`) and a user with a **strong** password.
2. Note host (usually `localhost`), database, user, password.
3. Your connection string: `mysql://USER:PASSWORD@localhost:3306/DATABASE`.
   If the password has `@ : / # ? %`, URL-encode them (`@` → `%40`, `#` → `%23`, `:` → `%3A`).

## 3. API app (`api.ighub.ng`)

1. Create the Node.js app on the `api` subdomain, Node 22 or 24.
2. Upload and extract `ighubos-api.zip` into the app's folder.
3. Entry / start: `main.mjs` (or command `node main.mjs`).
4. Environment variables:

   | Name | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | whatever port Hostinger assigns (often set for you) |
   | `DATABASE_URL` | the connection string from step 2 |
   | `BETTER_AUTH_SECRET` | 32+ random characters, new for production (generate below) |
   | `BETTER_AUTH_URL` | `https://os.ighub.ng` |
   | `WEB_ORIGINS` | `https://os.ighub.ng` |
   | `UPLOAD_DIR` | a folder **outside** `public_html`, e.g. `/home/<user>/ighubos-uploads` |

   Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

   If hPanel has no environment-variable screen, put the same lines in a `.env` file next to `main.mjs`.
5. In the app folder (SSH or hPanel terminal), once:
   ```sh
   node migrate.mjs                                                    # creates the tables
   ADMIN_EMAIL=you@ighub.ng ADMIN_NAME="Your Name" node create-admin.mjs
   ```
   `create-admin` prints a **temporary password once**. Keep it for step 5.
6. Start the app, then open `https://api.ighub.ng/api/v1/health`. Expect `{"status":"ok","database":"up"}`.

## 4. Web app (`os.ighub.ng`)

1. Create the Node.js app on the `os` subdomain, Node 22 or 24.
2. Upload and extract `ighubos-web.zip` into the app's folder.
3. Entry / start: `apps/web/server.js` (or command `node apps/web/server.js`).
4. Environment variables: `NODE_ENV=production`, plus `PORT` / `HOSTNAME` if Hostinger doesn't set them (`HOSTNAME=0.0.0.0`).
5. Enable free SSL on **both** subdomains and force HTTPS (login cookies are `Secure` in production).

## 5. First login

1. Open `https://os.ighub.ng`, log in with your email and the temporary password, set your own password.
2. Staff → **Create account** for each tester. Share their temporary passwords privately.

## Updating later

1. `pnpm package:deploy`
2. Upload/extract the new zip(s) over the old files (keep `.env` and the uploads folder).
3. API: run `node migrate.mjs` again (safe to repeat; only new migrations run). Restart both apps.

## Troubleshooting

| Symptom | Check |
|---|---|
| Login says "invalid origin" / 403 | `BETTER_AUTH_URL` and `WEB_ORIGINS` are exactly `https://os.ighub.ng` (no trailing slash) |
| Pages load but every list is empty / errors | Web package was built with the wrong `API_ORIGIN`; rebuild with `pnpm package:deploy` |
| API won't start: "Invalid environment" | The log lists the missing/invalid variable |
| Health says `database_down` | `DATABASE_URL` host/user/password; special characters URL-encoded |
| Uploads fail | `UPLOAD_DIR` exists and is writable by the app user |
