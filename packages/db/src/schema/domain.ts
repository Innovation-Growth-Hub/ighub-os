import {
  boolean,
  date,
  datetime,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { user } from "./auth.js";

/**
 * Domain tables. Shapes follow packages/shared/src/types.ts; the API maps rows
 * to those types. Money is DECIMAL(14,2) naira. Datetimes are UTC; `date`
 * columns are calendar days in Africa/Lagos.
 */

const id = () => varchar("id", { length: 36 }).primaryKey();
const userRef = (name: string) => varchar(name, { length: 36 }).references(() => user.id);
const at = (name: string) => datetime(name, { mode: "date", fsp: 3 });
const createdAt = () => at("created_at").notNull().$defaultFn(() => new Date());
const updatedAt = () => at("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date());
const money = (name: string) => decimal(name, { precision: 14, scale: 2, mode: "number" });

// ---------- Projects ----------

export const projects = mysqlTable("projects", {
  id: id(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description").notNull(),
  clientName: varchar("client_name", { length: 160 }),
  managerId: userRef("manager_id").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  budget: money("budget").notNull().default(0),
  spent: money("spent").notNull().default(0),
  status: mysqlEnum("status", ["planning", "active", "on_hold", "completed"]).notNull().default("planning"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const projectMembers = mysqlTable(
  "project_members",
  {
    projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: userRef("user_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] }), index("project_members_user_idx").on(t.userId)],
);

export const milestones = mysqlTable("milestones", {
  id: id(),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  done: boolean("done").notNull().default(false),
});

// ---------- Tasks ----------

export const tasks = mysqlTable(
  "tasks",
  {
    id: id(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    assignedTo: userRef("assigned_to").notNull(),
    createdBy: userRef("created_by").notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    priority: mysqlEnum("priority", ["low", "medium", "high"]).notNull().default("medium"),
    status: mysqlEnum("status", ["pending", "in_progress", "complete"]).notNull().default("pending"),
    projectId: varchar("project_id", { length: 36 }).references(() => projects.id, { onDelete: "set null" }),
    tags: json("tags").$type<string[]>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("tasks_assignee_idx").on(t.assignedTo), index("tasks_project_idx").on(t.projectId)],
);

// ---------- Daily logs ----------

export type DailyLogEntryJson = { id: string; description: string; hours?: number; taskId?: string };

export const dailyLogs = mysqlTable(
  "daily_logs",
  {
    id: id(),
    userId: userRef("user_id").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    entries: json("entries").$type<DailyLogEntryJson[]>().notNull(),
    blockers: text("blockers"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("daily_logs_user_date_uq").on(t.userId, t.date), index("daily_logs_date_idx").on(t.date)],
);

// ---------- Files (documents, quotes, receipts) ----------

export const files = mysqlTable("files", {
  id: id(),
  /** Path relative to UPLOAD_DIR. Never served directly; only through authorised download routes. */
  storageKey: varchar("storage_key", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 127 }).notNull(),
  sizeBytes: int("size_bytes").notNull(),
  uploadedBy: userRef("uploaded_by").notNull(),
  createdAt: createdAt(),
});

// ---------- Fund requests ----------

export const fundRequests = mysqlTable(
  "fund_requests",
  {
    id: id(),
    requesterId: userRef("requester_id").notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    purpose: text("purpose").notNull(),
    amount: money("amount").notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    neededBy: date("needed_by", { mode: "string" }).notNull(),
    projectId: varchar("project_id", { length: 36 }).references(() => projects.id, { onDelete: "set null" }),
    status: mysqlEnum("status", ["pending_review", "forwarded", "approved", "rejected", "disbursed"]).notNull().default("pending_review"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("fund_requests_requester_idx").on(t.requesterId), index("fund_requests_status_idx").on(t.status)],
);

export const fundRequestEvents = mysqlTable(
  "fund_request_events",
  {
    id: id(),
    requestId: varchar("request_id", { length: 36 }).notNull().references(() => fundRequests.id, { onDelete: "cascade" }),
    actorId: userRef("actor_id").notNull(),
    action: mysqlEnum("action", ["submitted", "forwarded", "approved", "rejected", "disbursed"]).notNull(),
    note: text("note"),
    at: at("at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("fund_request_events_request_idx").on(t.requestId)],
);

export const fundRequestAttachments = mysqlTable(
  "fund_request_attachments",
  {
    id: id(),
    requestId: varchar("request_id", { length: 36 }).notNull().references(() => fundRequests.id, { onDelete: "cascade" }),
    fileId: varchar("file_id", { length: 36 }).notNull().references(() => files.id),
    kind: mysqlEnum("kind", ["quote", "receipt"]).notNull(),
  },
  (t) => [index("fund_request_attachments_request_idx").on(t.requestId)],
);

// ---------- Finance ----------

export const transactions = mysqlTable(
  "transactions",
  {
    id: id(),
    kind: mysqlEnum("kind", ["income", "expense"]).notNull(),
    amount: money("amount").notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    date: date("date", { mode: "string" }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    fundRequestId: varchar("fund_request_id", { length: 36 }).references(() => fundRequests.id),
    recordedBy: userRef("recorded_by").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("transactions_date_idx").on(t.date)],
);

export const invoices = mysqlTable("invoices", {
  id: id(),
  number: varchar("number", { length: 32 }).notNull().unique(),
  contactId: varchar("contact_id", { length: 36 }).references(() => contacts.id, { onDelete: "set null" }),
  clientName: varchar("client_name", { length: 160 }).notNull(),
  amount: money("amount").notNull(),
  issuedAt: date("issued_at", { mode: "string" }).notNull(),
  dueAt: date("due_at", { mode: "string" }).notNull(),
  status: mysqlEnum("status", ["draft", "sent", "paid", "overdue"]).notNull().default("draft"),
  createdAt: createdAt(),
});

// ---------- Documents ----------

export const documents = mysqlTable("documents", {
  id: id(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["contracts", "proposals", "reports", "training"]).notNull(),
  fileId: varchar("file_id", { length: 36 }).notNull().references(() => files.id),
  ownerId: userRef("owner_id").notNull(),
  version: int("version").notNull().default(1),
  updatedAt: updatedAt(),
});

export const documentShares = mysqlTable(
  "document_shares",
  {
    documentId: varchar("document_id", { length: 36 }).notNull().references(() => documents.id, { onDelete: "cascade" }),
    userId: userRef("user_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.documentId, t.userId] })],
);

// ---------- Meetings ----------

export const meetings = mysqlTable("meetings", {
  id: id(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  start: at("start").notNull(),
  end: at("end").notNull(),
  location: varchar("location", { length: 200 }).notNull(),
  agenda: json("agenda").$type<string[]>().notNull(),
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled"]).notNull().default("scheduled"),
  organizerId: userRef("organizer_id").notNull(),
  createdAt: createdAt(),
});

export const meetingParticipants = mysqlTable(
  "meeting_participants",
  {
    meetingId: varchar("meeting_id", { length: 36 }).notNull().references(() => meetings.id, { onDelete: "cascade" }),
    userId: userRef("user_id").notNull(),
    position: int("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.meetingId, t.userId] }), index("meeting_participants_user_idx").on(t.userId)],
);

// ---------- CRM ----------

export const contacts = mysqlTable("contacts", {
  id: id(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull().default(""),
  company: varchar("company", { length: 160 }).notNull(),
  position: varchar("position", { length: 120 }).notNull().default(""),
  segment: mysqlEnum("segment", ["corporate", "government", "startup", "ngo"]).notNull(),
  lastContactedAt: at("last_contacted_at").notNull().$defaultFn(() => new Date()),
  createdAt: createdAt(),
});

export const deals = mysqlTable("deals", {
  id: id(),
  name: varchar("name", { length: 200 }).notNull(),
  contactId: varchar("contact_id", { length: 36 }).notNull().references(() => contacts.id, { onDelete: "cascade" }),
  stage: mysqlEnum("stage", ["lead", "qualified", "proposal", "negotiation", "won", "lost"]).notNull().default("lead"),
  value: money("value").notNull(),
  probability: int("probability").notNull().default(10),
  createdAt: createdAt(),
});

export const communications = mysqlTable(
  "communications",
  {
    id: id(),
    contactId: varchar("contact_id", { length: 36 }).notNull().references(() => contacts.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["call", "email", "meeting"]).notNull(),
    summary: text("summary").notNull(),
    loggedBy: userRef("logged_by").notNull(),
    at: at("at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("communications_contact_idx").on(t.contactId)],
);

// ---------- Activity feed ----------

export const activities = mysqlTable(
  "activities",
  {
    id: id(),
    actorId: userRef("actor_id").notNull(),
    message: varchar("message", { length: 255 }).notNull(),
    at: at("at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("activities_at_idx").on(t.at)],
);
