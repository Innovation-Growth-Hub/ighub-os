import { existsSync } from "node:fs";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().startsWith("mysql://", "DATABASE_URL must be a mysql:// URL"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
  WEB_ORIGINS: z
    .string()
    .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean))
    .pipe(z.array(z.url()).min(1)),
});

export type Env = z.infer<typeof schema>;

/**
 * Reads apps/api/.env (if present) and validates every variable.
 * The app refuses to start misconfigured.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (source === process.env && existsSync(".env") && process.env.NODE_ENV !== "test") process.loadEnvFile(".env");
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment (see apps/api/.env.example):\n${lines}`);
  }
  return parsed.data;
}

export const ENV = Symbol("ENV");
