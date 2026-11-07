import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { user } from "@ighub/db";
import type { OfficeLocation, Role, StaffType, User } from "@ighub/shared";
import { DB, type Database } from "../db/db.module.js";

type UserRow = typeof user.$inferSelect;

/** API shape of an account: the shared `User` plus the first-login flag. */
export type AccountDto = User & { mustChangePassword: boolean };

export function toAccountDto(row: UserRow): AccountDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as Role,
    position: row.position,
    phone: row.phone ?? undefined,
    staffType: (row.staffType ?? undefined) as StaffType | undefined,
    officeLocation: (row.officeLocation ?? undefined) as OfficeLocation | undefined,
    company: row.company ?? undefined,
    isActive: !row.banned,
    joinedAt: row.createdAt.toISOString().slice(0, 10),
    mustChangePassword: row.mustChangePassword,
  };
}

export type ProfilePatch = Partial<Pick<UserRow, "name" | "position" | "phone" | "staffType" | "officeLocation" | "role" | "mustChangePassword">>;

/** Data access only. Permission decisions live in the service and the guard. */
@Injectable()
export class AccountsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list() {
    const rows = await this.db.select().from(user).orderBy(asc(user.name));
    return rows.map(toAccountDto);
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(user).where(eq(user.id, id)).limit(1);
    return row ? toAccountDto(row) : null;
  }

  async update(id: string, patch: ProfilePatch) {
    if (Object.keys(patch).length) await this.db.update(user).set(patch).where(eq(user.id, id));
    return this.findById(id);
  }
}
