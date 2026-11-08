/**
 * First super admin on a fresh server:
 *   ADMIN_EMAIL=you@ighub.ng ADMIN_NAME="Your Name" node create-admin.mjs
 * Prints a temporary password once. Refuses if a super admin exists.
 */
import { existsSync } from "node:fs";
import { createDb, createSuperAdmin } from "@ighub/db";

if (!process.env.DATABASE_URL && existsSync(".env")) process.loadEnvFile(".env");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");

const { db, pool } = createDb(process.env.DATABASE_URL, { connectionLimit: 1 });
try {
  const { email, password } = await createSuperAdmin(db, {
    email: process.env.ADMIN_EMAIL ?? "",
    name: process.env.ADMIN_NAME ?? "",
    position: process.env.ADMIN_POSITION,
  });
  console.log(`\nSuper admin created: ${email}\nTemporary password: ${password}\nLog in and set your own password. It won't be shown again.\n`);
} finally {
  await pool.end();
}
