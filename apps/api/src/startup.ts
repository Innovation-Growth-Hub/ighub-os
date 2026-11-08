import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Logger } from "@nestjs/common";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createDb, createSuperAdmin, hasSuperAdmin, migrationsFolder as devFolder } from "@ighub/db";
import type { Env } from "./config/env.js";

const log = new Logger("Startup");

/** Last startup failure (error code + safe message), shown by GET /health. Never contains secrets. */
export const startupState: { ok: boolean; pending: boolean; error?: string } = { ok: true, pending: true };

/** Readable DB error: unwraps Drizzle's "Failed query" to the mysql2 cause. Never includes the password. */
export function describeDbError(e: unknown): string {
  let err = e as { code?: string; message?: string; cause?: unknown } | undefined;
  while (err && err.cause && !err.code) err = err.cause as typeof err;
  return [err?.code, err?.message].filter(Boolean).join(": ").slice(0, 300) || "unknown error";
}
const describe = describeDbError;

/**
 * Runs before the server listens, so a fresh Hostinger app needs no terminal:
 *  1. applies pending migrations (unless AUTO_MIGRATE=false)
 *  2. if no super admin exists and ADMIN_EMAIL/ADMIN_NAME/ADMIN_PASSWORD are set,
 *     creates one (forced to change the password at first login)
 * Safe to run on every start: both steps do nothing when already done.
 */
export async function prepareDatabase(env: Env) {
  // One connection, so the named lock below is held for the whole run.
  const { db, pool } = createDb(env.DATABASE_URL, { connectionLimit: 1 });
  try {
    // Hosts can briefly run two copies during a restart; only one may migrate at a time.
    const [rows] = await pool.query("SELECT GET_LOCK('ighubos_startup', 120) AS got");
    if ((rows as Array<{ got: number }>)[0]?.got !== 1) throw new Error("Timed out waiting for another instance to finish database setup.");
    try {
      await runSteps(db);
    } finally {
      await pool.query("SELECT RELEASE_LOCK('ighubos_startup')").catch(() => undefined);
    }
    startupState.ok = true;
  } catch (e) {
    // Keep the server up so /api/v1/health can explain what went wrong.
    startupState.ok = false;
    startupState.error = describe(e);
    log.error(`Database preparation failed: ${startupState.error}`);
  } finally {
    startupState.pending = false;
    await pool.end().catch(() => undefined);
  }
}

async function runSteps(db: ReturnType<typeof createDb>["db"]) {
  if (process.env.AUTO_MIGRATE !== "false") {
    // Bundled: migrations sit next to main.mjs. Dev: the db package's folder.
    const bundled = fileURLToPath(new URL("./migrations", import.meta.url));
    await migrate(db, { migrationsFolder: existsSync(bundled) ? bundled : devFolder });
    log.log("Database migrations are up to date.");
  }

  const { ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } = process.env;
  if (ADMIN_EMAIL && ADMIN_NAME && ADMIN_PASSWORD && !(await hasSuperAdmin(db))) {
    const { email } = await createSuperAdmin(db, { email: ADMIN_EMAIL, name: ADMIN_NAME, password: ADMIN_PASSWORD });
    log.log(`Created the first super admin (${email}). They must change the password at first login.`);
  }
}
