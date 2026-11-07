/**
 * Applies pending SQL migrations. In the deploy bundle: `node migrate.mjs`
 * (reads DATABASE_URL from the environment or ./.env; migrations in ./migrations).
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createDb, migrationsFolder as devFolder } from "@ighub/db";

if (!process.env.DATABASE_URL && existsSync(".env")) process.loadEnvFile(".env");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");

// Bundled: migrations sit next to this file. Dev: use the db package's folder.
const bundled = fileURLToPath(new URL("./migrations", import.meta.url));
const folder = existsSync(bundled) ? bundled : devFolder;

const { db, pool } = createDb(process.env.DATABASE_URL, { connectionLimit: 1 });
try {
  await migrate(db, { migrationsFolder: folder });
  console.log("Migrations applied.");
} finally {
  await pool.end();
}
