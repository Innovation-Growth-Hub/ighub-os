import { z } from "zod";
import { EXPENSE_CATEGORIES, INCOME_SOURCES } from "./constants.js";

/** Request schemas for the domain modules. Dates are YYYY-MM-DD (Lagos calendar day). */

const day = z.iso.date();
const id = z.string().min(1).max(36);
const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));
/** Multipart forms send numbers as strings. */
const naira = z.coerce.number().positive().max(1_000_000_000);

// ---------- Projects ----------

export const createProjectSchema = z
  .object({
    name: text(160),
    description: text(5000),
    clientName: optionalText(160),
    managerId: id,
    teamIds: z.array(id).max(50).default([]),
    startDate: day,
    endDate: day,
    budget: z.coerce.number().min(0).max(1_000_000_000),
    status: z.enum(["planning", "active", "on_hold", "completed"]).default("planning"),
  })
  .refine((p) => p.endDate >= p.startDate, { message: "End date must be after the start date.", path: ["endDate"] });
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const createMilestoneSchema = z.object({ title: text(200), dueDate: day });
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

// ---------- Tasks ----------

export const createTaskSchema = z.object({
  title: text(200),
  description: optionalText(5000),
  assignedTo: id,
  dueDate: day,
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  projectId: z.string().max(36).optional().transform((v) => v || undefined),
  tags: z.array(z.string().trim().min(1).max(32)).max(10).default([]),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const moveTaskSchema = z.object({ status: z.enum(["pending", "in_progress", "complete"]) });
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

// ---------- Daily logs ----------

export const saveDailyLogSchema = z.object({
  entries: z
    .array(
      z.object({
        id: z.string().max(36).optional(),
        description: text(500),
        hours: z.number().min(0).max(24).optional(),
        taskId: z.string().max(36).optional().transform((v) => v || undefined),
      }),
    )
    .min(1, "Add at least one thing you worked on.")
    .max(30),
  blockers: optionalText(2000),
});
export type SaveDailyLogInput = z.infer<typeof saveDailyLogSchema>;

// ---------- Fund requests ----------

export const createFundRequestSchema = z.object({
  title: text(200),
  purpose: text(5000),
  amount: naira,
  category: z.enum(EXPENSE_CATEGORIES as [string, ...string[]]),
  neededBy: day,
  projectId: z.string().max(36).optional().transform((v) => v || undefined),
});
export type CreateFundRequestInput = z.infer<typeof createFundRequestSchema>;

export const decideFundRequestSchema = z
  .object({
    decision: z.enum(["forwarded", "approved", "rejected", "disbursed"]),
    note: optionalText(2000),
  })
  .refine((d) => d.decision !== "rejected" || !!d.note, { message: "Give a reason for rejecting.", path: ["note"] });
export type DecideFundRequestInput = z.infer<typeof decideFundRequestSchema>;

// ---------- Finance ----------

export const createTransactionSchema = z
  .object({
    kind: z.enum(["income", "expense"]),
    amount: naira,
    category: text(64),
    date: day,
    description: text(255),
  })
  .refine((t) => (t.kind === "income" ? INCOME_SOURCES : EXPENSE_CATEGORIES).includes(t.category), {
    message: "Unknown category.",
    path: ["category"],
  });
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const createInvoiceSchema = z.object({
  number: text(32),
  contactId: z.string().max(36).optional().transform((v) => v || undefined),
  clientName: text(160),
  amount: naira,
  issuedAt: day,
  dueAt: day,
  status: z.enum(["draft", "sent", "paid", "overdue"]).default("draft"),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const invoiceStatusSchema = z.object({ status: z.enum(["draft", "sent", "paid", "overdue"]) });

// ---------- Meetings ----------

export const createMeetingSchema = z
  .object({
    title: text(200),
    description: z.string().trim().max(5000).default(""),
    start: z.iso.datetime({ local: true, offset: true }),
    end: z.iso.datetime({ local: true, offset: true }),
    location: text(200),
    participantIds: z.array(id).min(1).max(100),
    agenda: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  })
  .refine((m) => m.end > m.start, { message: "The meeting must end after it starts.", path: ["end"] });
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

export const meetingStatusSchema = z.object({ status: z.enum(["scheduled", "completed", "cancelled"]) });

// ---------- Documents ----------

export const documentCategorySchema = z.enum(["contracts", "proposals", "reports", "training"]);
export const uploadDocumentSchema = z.object({ category: documentCategorySchema });
export const shareDocumentSchema = z.object({ userIds: z.array(id).max(200) });

// ---------- CRM ----------

export const createContactSchema = z.object({
  name: text(160),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  phone: z.string().trim().max(32).default(""),
  company: text(160),
  position: z.string().trim().max(120).default(""),
  segment: z.enum(["corporate", "government", "startup", "ngo"]),
});
export type CreateContactInput = z.infer<typeof createContactSchema>;

export const createDealSchema = z.object({
  name: text(200),
  contactId: id,
  value: naira,
  stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]).default("lead"),
  probability: z.coerce.number().int().min(0).max(100).default(10),
});
export type CreateDealInput = z.infer<typeof createDealSchema>;

export const moveDealSchema = z.object({ stage: z.enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"]) });

export const createCommunicationSchema = z.object({
  contactId: id,
  type: z.enum(["call", "email", "meeting"]),
  summary: text(2000),
});
export type CreateCommunicationInput = z.infer<typeof createCommunicationSchema>;
