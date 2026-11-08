import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { generateTempPassword } from "@ighub/shared";
import type { Database } from "./client.js";
import { account, user } from "./schema/index.js";

/**
 * Creates the first super admin with a temporary password (must be changed at
 * first login). Refuses if a super admin already exists. Returns the password once.
 */
export async function createSuperAdmin(db: Database, input: { email: string; name: string; position?: string; password?: string }) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || !name) throw new Error("Email and name are required.");
  if (await hasSuperAdmin(db)) throw new Error("A super admin already exists. Use the app to create more accounts.");

  const password = input.password || generateTempPassword();
  if (password.length < 8) throw new Error("The admin password must be at least 8 characters.");
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id,
      name,
      email,
      emailVerified: true,
      role: "super_admin",
      position: input.position?.trim() || "Super Admin",
      staffType: "core_team",
      officeLocation: "umuahia_hq",
      mustChangePassword: true,
    });
    await tx.insert(account).values({ id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(password) });
  });
  return { email, password };
}

export async function hasSuperAdmin(db: Database) {
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.role, "super_admin")).limit(1);
  return existing.length > 0;
}
