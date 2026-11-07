import { boolean, datetime, index, mysqlEnum, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

/**
 * Better Auth tables (core + admin plugin), shaped exactly as Better Auth 1.7
 * expects. Property names are what Better Auth reads; column names are snake_case.
 * Our staff profile lives on `user` as additional fields (see apps/api/src/auth/auth.ts).
 *
 * All datetimes are UTC (the mysql2 pool uses timezone "Z").
 */

const id = () => varchar("id", { length: 36 }).primaryKey();
const createdAt = () => datetime("created_at", { mode: "date", fsp: 3 }).notNull().$defaultFn(() => new Date());
const updatedAt = () =>
  datetime("updated_at", { mode: "date", fsp: 3 })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

export const user = mysqlTable("user", {
  id: id(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),

  // admin plugin
  role: varchar("role", { length: 32 }).notNull().default("staff"),
  banned: boolean("banned").notNull().default(false),
  banReason: text("ban_reason"),
  banExpires: datetime("ban_expires", { mode: "date", fsp: 3 }),

  // IGHub profile (Better Auth additionalFields, input: false)
  position: varchar("position", { length: 120 }).notNull().default(""),
  phone: varchar("phone", { length: 32 }),
  staffType: mysqlEnum("staff_type", ["core_team", "corper", "intern"]),
  officeLocation: mysqlEnum("office_location", ["umuahia_hq", "aba_hub"]),
  company: varchar("company", { length: 160 }),
  /** True after the super admin creates the account or resets its password. */
  mustChangePassword: boolean("must_change_password").notNull().default(false),
});

export const session = mysqlTable(
  "session",
  {
    id: id(),
    expiresAt: datetime("expires_at", { mode: "date", fsp: 3 }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: varchar("impersonated_by", { length: 36 }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = mysqlTable(
  "account",
  {
    id: id(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 64 }).notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: datetime("access_token_expires_at", { mode: "date", fsp: 3 }),
    refreshTokenExpiresAt: datetime("refresh_token_expires_at", { mode: "date", fsp: 3 }),
    scope: text("scope"),
    /** scrypt hash for email/password accounts (providerId "credential"). */
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = mysqlTable(
  "verification",
  {
    id: id(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: datetime("expires_at", { mode: "date", fsp: 3 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
