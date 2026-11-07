import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// The API owns the env file; db scripts read the same one.
const envFile = "../../apps/api/.env";
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);
// `generate` only diffs the schema files, so it works without a database.
const needsDb = !process.argv.includes("generate");
if (needsDb && !process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env.");

export default defineConfig({
  dialect: "mysql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "mysql://unused@localhost/unused" },
  strict: true,
  verbose: true,
});
