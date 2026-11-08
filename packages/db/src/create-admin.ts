/**
 * Local helper: ADMIN_EMAIL=you@ighub.ng ADMIN_NAME="Your Name" pnpm db:create-admin
 * (On the server use `node create-admin.mjs` from the API deploy bundle.)
 */
import { existsSync } from "node:fs";
import { createSuperAdmin } from "./admin.js";
import { createDb } from "./client.js";

const envFile = "../../apps/api/.env";
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
const { db, pool } = createDb(process.env.DATABASE_URL, { connectionLimit: 1 });
try {
  const { email, password } = await createSuperAdmin(db, {
    email: process.env.ADMIN_EMAIL ?? "",
    name: process.env.ADMIN_NAME ?? "",
    position: process.env.ADMIN_POSITION,
  });
  console.log(`\nSuper admin created: ${email}\nTemporary password: ${password}\nLog in and set your own password.\n`);
} finally {
  await pool.end();
}
