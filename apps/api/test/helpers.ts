import "reflect-metadata";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { hashPassword } from "better-auth/crypto";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/mysql2/migrator";
import request from "supertest";
import { account, createDb, migrationsFolder, user } from "@ighub/db";
import { createApp } from "../src/bootstrap.js";
import type { Env } from "../src/config/env.js";

if (!process.env.TEST_DATABASE_URL && existsSync(".env")) process.loadEnvFile(".env");
export const TEST_DB = process.env.TEST_DATABASE_URL;
export const ORIGIN = "http://localhost:3000";

/** Fresh, migrated test database + a running app. Files run one at a time (vitest.config.e2e.ts). */
export async function setup() {
  const conn = createDb(TEST_DB!, { connectionLimit: 2 });
  await conn.db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  const tables = (await conn.pool.query("SHOW TABLES"))[0] as Array<Record<string, string>>;
  for (const row of tables) await conn.pool.query(`DROP TABLE \`${Object.values(row)[0]}\``);
  await conn.db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
  await migrate(conn.db, { migrationsFolder });

  const env: Env = {
    NODE_ENV: "test",
    PORT: 0,
    DATABASE_URL: TEST_DB!,
    BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e",
    BETTER_AUTH_URL: ORIGIN,
    WEB_ORIGINS: [ORIGIN],
    UPLOAD_DIR: "./.e2e-uploads",
  };
  const app: INestApplication = await createApp(env);
  await app.init();

  const http = () => request(app.getHttpServer());

  async function seedUser(email: string, role: string, password = "password") {
    const id = randomUUID();
    await conn.db.insert(user).values({ id, name: email.split("@")[0]!, email, role, position: "Test", staffType: "core_team", officeLocation: "umuahia_hq" });
    await conn.db.insert(account).values({ id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(password) });
    return id;
  }

  /** Sign in; returns a client whose requests carry the session cookie and a trusted Origin. */
  async function as(email: string, password = "password") {
    const res = await http().post("/api/auth/sign-in/email").set("Origin", ORIGIN).send({ email, password });
    if (res.status !== 200) throw new Error(`sign-in failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
    const cookie = res.headers["set-cookie"] as unknown as string[];
    const withAuth = (r: request.Test) => r.set("Cookie", cookie).set("Origin", ORIGIN);
    return {
      id: res.body.user.id as string,
      get: (p: string) => withAuth(http().get(`/api/v1${p}`)),
      post: (p: string, body?: object) => withAuth(http().post(`/api/v1${p}`)).send(body),
      patch: (p: string, body?: object) => withAuth(http().patch(`/api/v1${p}`)).send(body),
      put: (p: string, body?: object) => withAuth(http().put(`/api/v1${p}`)).send(body),
      delete: (p: string) => withAuth(http().delete(`/api/v1${p}`)),
      multipart: (p: string) => withAuth(http().post(`/api/v1${p}`)),
    };
  }

  async function teardown() {
    await app.close();
    await conn.pool.end();
  }

  return { app, conn, http, seedUser, as, teardown };
}
