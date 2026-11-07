/**
 * End-to-end: the real app (same bootstrap as production) against a real MySQL
 * test database. Covers the account model from AUTH-ARCHITECTURE §6.
 *
 * Needs TEST_DATABASE_URL (apps/api/.env). The database is wiped and migrated.
 *   pnpm --filter @ighub/api test:e2e
 */
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
const TEST_DB = process.env.TEST_DATABASE_URL;
const ORIGIN = "http://localhost:3000";

describe.skipIf(!TEST_DB)("accounts (e2e)", () => {
  let app: INestApplication;
  let conn: ReturnType<typeof createDb>;
  const http = () => request(app.getHttpServer());

  /** Insert an account directly, like the seed does. */
  async function seedUser(email: string, role: string, password = "password") {
    const id = randomUUID();
    await conn.db.insert(user).values({ id, name: email.split("@")[0], email, role, position: "Test", staffType: "core_team", officeLocation: "umuahia_hq" });
    await conn.db.insert(account).values({ id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(password) });
    return id;
  }

  /** Sign in and return the session cookie. */
  async function signIn(email: string, password = "password") {
    const res = await http().post("/api/auth/sign-in/email").set("Origin", ORIGIN).send({ email, password });
    return { res, cookie: res.headers["set-cookie"] as unknown as string[] | undefined };
  }

  beforeAll(async () => {
    conn = createDb(TEST_DB!, { connectionLimit: 2 });
    await conn.db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
    const tables = (await conn.pool.query("SHOW TABLES"))[0] as Array<Record<string, string>>;
    for (const row of tables) await conn.pool.query(`DROP TABLE \`${Object.values(row)[0]}\``);
    await conn.db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
    await migrate(conn.db, { migrationsFolder });

    await seedUser("super@test.ighub", "super_admin");
    await seedUser("admin@test.ighub", "admin");
    await seedUser("staff@test.ighub", "staff");
    await seedUser("trainer@test.ighub", "trainer");

    const env: Env = {
      NODE_ENV: "test",
      PORT: 0,
      DATABASE_URL: TEST_DB!,
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e",
      BETTER_AUTH_URL: ORIGIN,
      WEB_ORIGINS: [ORIGIN],
    };
    app = await createApp(env);
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await conn?.pool.end();
  });

  it("refuses public sign-up", async () => {
    const res = await http().post("/api/auth/sign-up/email").set("Origin", ORIGIN).send({ email: "new@test.ighub", password: "password123", name: "New" });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("refuses sign-in for coming-soon roles", async () => {
    const { res } = await signIn("trainer@test.ighub");
    expect(res.status).toBe(403);
  });

  it("only lets the super admin create accounts", async () => {
    const staff = await signIn("staff@test.ighub");
    const admin = await signIn("admin@test.ighub");
    const body = { name: "Nobody", email: "nobody@test.ighub", role: "staff", position: "X", staffType: "intern", officeLocation: "aba_hub" };
    expect((await http().post("/api/v1/accounts").set("Cookie", staff.cookie!).set("Origin", ORIGIN).send(body)).status).toBe(403);
    expect((await http().post("/api/v1/accounts").set("Cookie", admin.cookie!).set("Origin", ORIGIN).send(body)).status).toBe(403);
    // Admin can read the staff list; staff can't.
    expect((await http().get("/api/v1/accounts").set("Cookie", admin.cookie!)).status).toBe(200);
    expect((await http().get("/api/v1/accounts").set("Cookie", staff.cookie!)).status).toBe(403);
  });

  it("validates input and refuses coming-soon roles", async () => {
    const { cookie } = await signIn("super@test.ighub");
    const res = await http()
      .post("/api/v1/accounts")
      .set("Cookie", cookie!)
      .set("Origin", ORIGIN)
      .send({ name: "T", email: "not-an-email", role: "trainer", position: "X", staffType: "intern", officeLocation: "aba_hub" });
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.body.code).toBe("validation_failed");
    expect(res.body.errors.map((e: { path: string }) => e.path)).toEqual(expect.arrayContaining(["email", "role", "name"]));
  });

  it("runs the full account lifecycle: create → first login → forced change → reset → deactivate", async () => {
    const sup = await signIn("super@test.ighub");

    // 1. Super admin creates the account; the temporary password comes back once.
    const created = await http()
      .post("/api/v1/accounts")
      .set("Cookie", sup.cookie!)
      .set("Origin", ORIGIN)
      .send({ name: "Ada Obi", email: " Ada@Test.IGHub ", role: "accountant", position: "Accountant", staffType: "core_team", officeLocation: "aba_hub" });
    expect(created.status).toBe(201);
    const { account: acct, temporaryPassword } = created.body;
    expect(acct).toMatchObject({ email: "ada@test.ighub", role: "accountant", position: "Accountant", officeLocation: "aba_hub", mustChangePassword: true, isActive: true });
    expect(temporaryPassword).toMatch(/^ighub-/);

    // Duplicate email is refused.
    const dup = await http().post("/api/v1/accounts").set("Cookie", sup.cookie!).set("Origin", ORIGIN)
      .send({ name: "Ada Again", email: "ada@test.ighub", role: "staff", position: "X", staffType: "intern", officeLocation: "aba_hub" });
    expect(dup.status).toBeGreaterThanOrEqual(400);
    expect(dup.status).toBeLessThan(500);

    // 2. First login works, but only /me is reachable until the password changes.
    const first = await signIn("ada@test.ighub", temporaryPassword);
    expect(first.res.status).toBe(200);
    const me = await http().get("/api/v1/me").set("Cookie", first.cookie!);
    expect(me.status).toBe(200);
    expect(me.body.mustChangePassword).toBe(true);
    const blocked = await http().get("/api/v1/accounts").set("Cookie", first.cookie!);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("password_change_required");

    // 3. Changing the password clears the flag.
    const changed = await http()
      .post("/api/auth/change-password")
      .set("Cookie", first.cookie!)
      .set("Origin", ORIGIN)
      .send({ currentPassword: temporaryPassword, newPassword: "my-own-password", revokeOtherSessions: true });
    expect(changed.status).toBe(200);
    const cookieAfterChange = (changed.headers["set-cookie"] as unknown as string[] | undefined) ?? first.cookie!;
    const meAfter = await http().get("/api/v1/me").set("Cookie", cookieAfterChange);
    expect(meAfter.body.mustChangePassword).toBe(false);
    expect((await signIn("ada@test.ighub", "my-own-password")).res.status).toBe(200);

    // 4. Reset: new temporary password, flag back on, existing sessions signed out.
    const reset = await http().post(`/api/v1/accounts/${acct.id}/reset-password`).set("Cookie", sup.cookie!).set("Origin", ORIGIN);
    expect(reset.status).toBe(200);
    expect((await http().get("/api/v1/me").set("Cookie", cookieAfterChange)).status).toBe(401);
    expect((await signIn("ada@test.ighub", "my-own-password")).res.status).toBe(401);
    const afterReset = await signIn("ada@test.ighub", reset.body.temporaryPassword);
    expect((await http().get("/api/v1/me").set("Cookie", afterReset.cookie!)).body.mustChangePassword).toBe(true);

    // 5. Deactivate: sign-in refused. The super admin can't deactivate themselves.
    const off = await http().patch(`/api/v1/accounts/${acct.id}/status`).set("Cookie", sup.cookie!).set("Origin", ORIGIN).send({ active: false });
    expect(off.status).toBe(200);
    expect(off.body.isActive).toBe(false);
    expect((await signIn("ada@test.ighub", reset.body.temporaryPassword)).res.status).toBe(403);

    const superMe = await http().get("/api/v1/me").set("Cookie", sup.cookie!);
    const self = await http().patch(`/api/v1/accounts/${superMe.body.id}/status`).set("Cookie", sup.cookie!).set("Origin", ORIGIN).send({ active: false });
    expect(self.status).toBe(400);
    expect(self.body.code).toBe("cannot_deactivate_self");
  }, 60_000);
});
