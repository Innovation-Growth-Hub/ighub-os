/**
 * Dev/staging seed: the live-role demo accounts the UI was designed against
 * (same people as apps/web/src/lib/mock/seed.ts). Idempotent: existing emails
 * are skipped. Refuses to run in production.
 *
 *   pnpm db:seed
 */
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import type { OfficeLocation, Role, StaffType } from "@ighub/shared";
import { createDb } from "./client.js";
import { account, user } from "./schema/index.js";

const envFile = "../../apps/api/.env";
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);
if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo accounts in production.");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env.");

/** Demo password for every seeded account (PRD §10.3). Dev and staging only. */
const DEMO_PASSWORD = "password";

type SeedUser = {
  name: string;
  email: string;
  role: Role;
  position: string;
  staffType: StaffType;
  officeLocation: OfficeLocation;
  phone?: string;
  joinedAt: string;
  banned?: boolean;
};

const users: SeedUser[] = [
  { name: "Chidi Okafor", email: "superadmin@ighub.com", role: "super_admin", position: "Hub Director", staffType: "core_team", officeLocation: "umuahia_hq", joinedAt: "2022-01-10", phone: "+234 803 111 0001" },
  { name: "Ngozi Eze", email: "admin@ighub.com", role: "admin", position: "Operations Lead", staffType: "core_team", officeLocation: "umuahia_hq", joinedAt: "2022-03-02", phone: "+234 803 111 0002" },
  { name: "Emeka Nwosu", email: "staff@ighub.com", role: "staff", position: "Frontend Developer", staffType: "core_team", officeLocation: "umuahia_hq", joinedAt: "2023-06-12", phone: "+234 803 111 0003" },
  { name: "Adaeze Uche", email: "pm@ighub.com", role: "project_manager", position: "Project Manager", staffType: "core_team", officeLocation: "aba_hub", joinedAt: "2023-02-20", phone: "+234 803 111 0004" },
  { name: "Chinwe Okeke", email: "accounts@ighub.com", role: "accountant", position: "Accountant", staffType: "core_team", officeLocation: "umuahia_hq", joinedAt: "2023-04-17", phone: "+234 803 111 0007" },
  { name: "Blessing Okoro", email: "blessing@ighub.com", role: "staff", position: "Backend Developer", staffType: "core_team", officeLocation: "umuahia_hq", joinedAt: "2023-11-15" },
  { name: "Kelechi Amadi", email: "kelechi@ighub.com", role: "staff", position: "UI/UX Designer", staffType: "corper", officeLocation: "umuahia_hq", joinedAt: "2026-03-04" },
  { name: "Amaka Ibe", email: "amaka@ighub.com", role: "staff", position: "Community Manager", staffType: "corper", officeLocation: "aba_hub", joinedAt: "2026-03-04" },
  { name: "Somto Eke", email: "somto@ighub.com", role: "staff", position: "Data Analyst", staffType: "intern", officeLocation: "umuahia_hq", joinedAt: "2026-07-01" },
  { name: "Chioma Nnadi", email: "chioma@ighub.com", role: "staff", position: "Mobile Developer", staffType: "intern", officeLocation: "aba_hub", joinedAt: "2026-07-01" },
  { name: "Uchenna Ogbu", email: "uchenna@ighub.com", role: "staff", position: "IT Support", staffType: "core_team", officeLocation: "aba_hub", joinedAt: "2022-08-19", banned: true },
];

const { db, pool } = createDb(url, { connectionLimit: 2 });
const hash = await hashPassword(DEMO_PASSWORD);
let created = 0;

for (const u of users) {
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, u.email)).limit(1);
  if (existing.length) continue;
  const id = randomUUID();
  const joined = new Date(`${u.joinedAt}T08:00:00Z`);
  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id,
      name: u.name,
      email: u.email,
      emailVerified: true,
      role: u.role,
      banned: u.banned ?? false,
      banReason: u.banned ? "Deactivated" : null,
      position: u.position,
      phone: u.phone ?? null,
      staffType: u.staffType,
      officeLocation: u.officeLocation,
      mustChangePassword: false,
      createdAt: joined,
      updatedAt: joined,
    });
    // Better Auth email/password accounts: providerId "credential", accountId = user id.
    await tx.insert(account).values({ id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: hash });
  });
  created++;
}

console.log(`Seeded ${created} new account(s); ${users.length - created} already existed. Password: "${DEMO_PASSWORD}"`);
await pool.end();
