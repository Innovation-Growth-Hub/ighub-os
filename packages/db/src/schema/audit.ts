import { datetime, index, json, mysqlTable, varchar } from "drizzle-orm/mysql-core";

/**
 * Who did what, to whom. Written by the API for account changes, sign-ins and
 * (later) fund request decisions. Never updated or deleted by the app.
 */
export const auditLog = mysqlTable(
  "audit_log",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    actorId: varchar("actor_id", { length: 36 }),
    action: varchar("action", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 32 }),
    targetId: varchar("target_id", { length: 36 }),
    ip: varchar("ip", { length: 64 }),
    meta: json("meta").$type<Record<string, unknown>>(),
    at: datetime("at", { mode: "date", fsp: 3 }).notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("audit_log_target_idx").on(t.targetType, t.targetId), index("audit_log_actor_idx").on(t.actorId)],
);
