"use client";

/**
 * Mock data store (Zustand, persisted to localStorage).
 *
 * Every mutation the UI needs lives here as an action. When the Node API is
 * ready, each action becomes an API call (e.g. via TanStack Query mutations)
 * and the collections become query results — components keep the same shape.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Activity,
  Attendance,
  Communication,
  Contact,
  Course,
  DailyLog,
  DailyLogEntry,
  Deal,
  DealStage,
  DocumentFile,
  Enrollment,
  FundRequest,
  FundRequestAttachment,
  FundRequestEvent,
  Invoice,
  LateRequest,
  Meeting,
  MeetingStatus,
  OfficeLocation,
  Penalty,
  Project,
  RequestStatus,
  SocialAccount,
  SocialPost,
  Task,
  TaskStatus,
  Transaction,
  User,
} from "@/lib/types";
import * as seed from "@/lib/mock/seed";
import { toDateKey, uid, weekStart } from "@/lib/utils";

/** Clock-ins after 09:00 are late (PRD §5.4). */
export const LATE_AFTER = { hour: 9, minute: 0 };
/** 3+ late days in a week incurs ₦5,000 (PRD §7.3). */
export const PENALTY_THRESHOLD = 3;
export const PENALTY_AMOUNT = 5000;

interface Db {
  users: User[];
  attendance: Attendance[];
  lateRequests: LateRequest[];
  tasks: Task[];
  projects: Project[];
  contacts: Contact[];
  deals: Deal[];
  communications: Communication[];
  courses: Course[];
  enrollments: Enrollment[];
  transactions: Transaction[];
  invoices: Invoice[];
  documents: DocumentFile[];
  meetings: Meeting[];
  socialAccounts: SocialAccount[];
  socialPosts: SocialPost[];
  activities: Activity[];
  fundRequests: FundRequest[];
  dailyLogs: DailyLog[];
  /**
   * MOCK ONLY: plaintext passwords by user id, in localStorage. Better Auth
   * stores salted scrypt hashes in its `account` table on the server.
   */
  passwords: Record<string, string>;
}

export type FundRequestInput = Pick<FundRequest, "title" | "purpose" | "amount" | "category" | "neededBy" | "projectId">;

/** File metadata from an <input type="file">. Mock upload; the API will use presigned URLs. */
export type FileMeta = { name: string; sizeKb: number };

/** Reviewer actions. Who may take which action is checked in lib/fund-requests.ts. */
export type FundRequestDecision = Exclude<FundRequestEvent["action"], "submitted">;

interface Actions {
  // staff
  addUser: (u: Omit<User, "id" | "joinedAt" | "isActive">) => User;
  /** Account + password in one step (Better Auth: `admin.createUser`). */
  createAccount: (u: Omit<User, "id" | "joinedAt" | "isActive">, password: string) => User;
  setPassword: (userId: string, password: string, mustChange: boolean) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
  deleteUser: (id: string) => void;
  // attendance
  clockIn: (userId: string, office: OfficeLocation) => Attendance;
  clockOut: (userId: string) => void;
  addLateRequest: (userId: string, date: string, reason: string) => void;
  reviewLateRequest: (id: string, status: RequestStatus) => void;
  // tasks
  addTask: (t: Omit<Task, "id">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  // projects
  addProject: (p: Omit<Project, "id" | "spent" | "milestones">) => Project;
  toggleMilestone: (projectId: string, milestoneId: string) => void;
  // crm
  addContact: (c: Omit<Contact, "id" | "lastContactedAt">) => void;
  moveDeal: (id: string, stage: DealStage) => void;
  addCommunication: (c: Omit<Communication, "id" | "at">) => void;
  // lms
  addCourse: (c: Omit<Course, "id" | "lessons">) => void;
  toggleLesson: (enrollmentId: string, lessonId: string) => void;
  enroll: (userId: string, courseId: string) => void;
  // finance
  addTransaction: (t: Omit<Transaction, "id">) => void;
  // documents
  addDocument: (d: Omit<DocumentFile, "id" | "updatedAt" | "version">) => void;
  deleteDocument: (id: string) => void;
  shareDocument: (id: string, userIds: string[]) => void;
  // meetings
  addMeeting: (m: Omit<Meeting, "id" | "status">) => void;
  setMeetingStatus: (id: string, status: MeetingStatus) => void;
  // social
  schedulePost: (p: Omit<SocialPost, "id">) => void;
  // fund requests
  submitFundRequest: (requesterId: string, r: FundRequestInput, quotes: FileMeta[]) => void;
  attachToFundRequest: (id: string, userId: string, kind: FundRequestAttachment["kind"], files: FileMeta[]) => void;
  // daily logs
  saveDailyLog: (userId: string, date: string, entries: DailyLogEntry[], blockers?: string) => void;
  decideFundRequest: (id: string, actorId: string, decision: FundRequestDecision, note?: string) => void;
  // misc
  log: (actorId: string, message: string) => void;
  resetDemo: () => void;
}

const initialDb = (): Db => ({
  users: seed.seedUsers,
  attendance: seed.seedAttendance,
  lateRequests: seed.seedLateRequests,
  tasks: seed.seedTasks,
  projects: seed.seedProjects,
  contacts: seed.seedContacts,
  deals: seed.seedDeals,
  communications: seed.seedCommunications,
  courses: seed.seedCourses,
  enrollments: seed.seedEnrollments,
  transactions: seed.seedTransactions,
  invoices: seed.seedInvoices,
  documents: seed.seedDocuments,
  meetings: seed.seedMeetings,
  socialAccounts: seed.seedSocialAccounts,
  socialPosts: seed.seedSocialPosts,
  activities: seed.seedActivities,
  fundRequests: seed.seedFundRequests,
  dailyLogs: seed.seedDailyLogs,
  passwords: Object.fromEntries(seed.seedUsers.map((u) => [u.id, seed.DEMO_PASSWORD])),
});

const toAttachments = (files: FileMeta[], kind: FundRequestAttachment["kind"], userId: string): FundRequestAttachment[] =>
  files.map((f) => ({ ...f, id: uid("fa"), kind, uploadedBy: userId, uploadedAt: new Date().toISOString() }));

const NEXT_STATUS: Record<FundRequestDecision, FundRequest["status"]> = {
  forwarded: "forwarded",
  approved: "approved",
  rejected: "rejected",
  disbursed: "disbursed",
};

export const useDb = create<Db & Actions>()(
  persist(
    (set, get) => ({
      ...initialDb(),

      addUser: (u) => {
        const user: User = { ...u, id: uid("u"), isActive: true, joinedAt: toDateKey(new Date()) };
        set((s) => ({ users: [...s.users, user] }));
        return user;
      },
      createAccount: (u, password) => {
        const user = get().addUser({ ...u, mustChangePassword: true });
        set((s) => ({ passwords: { ...s.passwords, [user.id]: password } }));
        return user;
      },
      setPassword: (userId, password, mustChange) =>
        set((s) => ({
          passwords: { ...s.passwords, [userId]: password },
          users: s.users.map((u) => (u.id === userId ? { ...u, mustChangePassword: mustChange } : u)),
        })),
      updateUser: (id, patch) =>
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),
      deleteUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),

      clockIn: (userId, office) => {
        const now = new Date();
        const date = toDateKey(now);
        const late =
          now.getHours() > LATE_AFTER.hour ||
          (now.getHours() === LATE_AFTER.hour && now.getMinutes() > LATE_AFTER.minute);
        const row: Attendance = {
          id: `att_${userId}_${date}`,
          userId,
          date,
          clockIn: now.toISOString(),
          officeLocation: office,
          status: late ? "late" : "on_time",
        };
        set((s) => ({
          attendance: [...s.attendance.filter((a) => a.id !== row.id), row],
        }));
        get().log(userId, `clocked in at ${seed.OFFICES[office]}${late ? " (late)" : ""}`);
        return row;
      },
      clockOut: (userId) => {
        const date = toDateKey(new Date());
        set((s) => ({
          attendance: s.attendance.map((a) =>
            a.userId === userId && a.date === date ? { ...a, clockOut: new Date().toISOString() } : a,
          ),
        }));
        get().log(userId, "clocked out");
      },
      addLateRequest: (userId, date, reason) => {
        set((s) => ({
          lateRequests: [
            { id: uid("lr"), userId, date, reason, status: "pending", createdAt: new Date().toISOString() },
            ...s.lateRequests,
          ],
        }));
        get().log(userId, `submitted a late request for ${date}`);
      },
      reviewLateRequest: (id, status) =>
        set((s) => ({ lateRequests: s.lateRequests.map((r) => (r.id === id ? { ...r, status } : r)) })),

      addTask: (t) => set((s) => ({ tasks: [{ ...t, id: uid("t") }, ...s.tasks] })),
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      moveTask: (id, status) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addProject: (p) => {
        const project: Project = { ...p, id: uid("p"), spent: 0, milestones: [] };
        set((s) => ({ projects: [project, ...s.projects] }));
        return project;
      },
      toggleMilestone: (projectId, milestoneId) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, milestones: p.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m)) }
              : p,
          ),
        })),

      addContact: (c) =>
        set((s) => ({
          contacts: [{ ...c, id: uid("c"), lastContactedAt: new Date().toISOString() }, ...s.contacts],
        })),
      moveDeal: (id, stage) =>
        set((s) => ({
          deals: s.deals.map((d) =>
            d.id === id
              ? { ...d, stage, probability: stage === "won" ? 100 : stage === "lost" ? 0 : d.probability }
              : d,
          ),
        })),
      addCommunication: (c) =>
        set((s) => ({
          communications: [{ ...c, id: uid("cm"), at: new Date().toISOString() }, ...s.communications],
          contacts: s.contacts.map((ct) =>
            ct.id === c.contactId ? { ...ct, lastContactedAt: new Date().toISOString() } : ct,
          ),
        })),

      addCourse: (c) => set((s) => ({ courses: [...s.courses, { ...c, id: uid("co"), lessons: [] }] })),
      toggleLesson: (enrollmentId, lessonId) =>
        set((s) => ({
          enrollments: s.enrollments.map((e) =>
            e.id === enrollmentId
              ? {
                  ...e,
                  completedLessonIds: e.completedLessonIds.includes(lessonId)
                    ? e.completedLessonIds.filter((l) => l !== lessonId)
                    : [...e.completedLessonIds, lessonId],
                }
              : e,
          ),
        })),
      enroll: (userId, courseId) =>
        set((s) =>
          s.enrollments.some((e) => e.userId === userId && e.courseId === courseId)
            ? s
            : {
                enrollments: [
                  ...s.enrollments,
                  { id: uid("e"), userId, courseId, enrolledAt: toDateKey(new Date()), completedLessonIds: [] },
                ],
              },
        ),

      addTransaction: (t) => set((s) => ({ transactions: [{ ...t, id: uid("tx") }, ...s.transactions] })),

      addDocument: (d) =>
        set((s) => ({
          documents: [{ ...d, id: uid("doc"), updatedAt: new Date().toISOString(), version: 1 }, ...s.documents],
        })),
      deleteDocument: (id) => set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
      shareDocument: (id, userIds) =>
        set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, sharedWith: userIds } : d)) })),

      addMeeting: (m) => set((s) => ({ meetings: [...s.meetings, { ...m, id: uid("mt"), status: "scheduled" }] })),
      setMeetingStatus: (id, status) =>
        set((s) => ({ meetings: s.meetings.map((m) => (m.id === id ? { ...m, status } : m)) })),

      schedulePost: (p) => set((s) => ({ socialPosts: [{ ...p, id: uid("sp") }, ...s.socialPosts] })),

      submitFundRequest: (requesterId, r, quotes) => {
        const at = new Date().toISOString();
        set((s) => ({
          fundRequests: [
            {
              ...r,
              id: uid("fr"),
              requesterId,
              status: "pending_review",
              createdAt: at,
              history: [{ at, actorId: requesterId, action: "submitted" }],
              attachments: toAttachments(quotes, "quote", requesterId),
            },
            ...s.fundRequests,
          ],
        }));
        get().log(requesterId, `requested funds: “${r.title}”`);
      },
      decideFundRequest: (id, actorId, decision, note) => {
        const req = get().fundRequests.find((r) => r.id === id);
        if (!req) return;
        const at = new Date().toISOString();
        set((s) => ({
          fundRequests: s.fundRequests.map((r) =>
            r.id === id
              ? { ...r, status: NEXT_STATUS[decision], history: [...r.history, { at, actorId, action: decision, note: note || undefined }] }
              : r,
          ),
        }));
        // Paying out a request books it as an expense.
        if (decision === "disbursed") {
          get().addTransaction({ kind: "expense", amount: req.amount, category: req.category, date: toDateKey(new Date()), description: `Fund request: ${req.title}` });
        }
        get().log(actorId, `${decision} the fund request “${req.title}”`);
      },

      attachToFundRequest: (id, userId, kind, files) =>
        set((s) => ({
          fundRequests: s.fundRequests.map((r) =>
            r.id === id ? { ...r, attachments: [...r.attachments, ...toAttachments(files, kind, userId)] } : r,
          ),
        })),

      saveDailyLog: (userId, date, entries, blockers) => {
        const id = `log_${userId}_${date}`;
        const isNew = !get().dailyLogs.some((l) => l.id === id);
        const row: DailyLog = { id, userId, date, entries, blockers: blockers || undefined, updatedAt: new Date().toISOString() };
        set((s) => ({ dailyLogs: [row, ...s.dailyLogs.filter((l) => l.id !== id)] }));
        if (isNew) get().log(userId, `logged ${entries.length} task${entries.length === 1 ? "" : "s"} for today`);
      },

      log: (actorId, message) =>
        set((s) => ({
          activities: [{ id: uid("a"), actorId, message, at: new Date().toISOString() }, ...s.activities].slice(0, 50),
        })),
      resetDemo: () => set(initialDb()),
    }),
    {
      name: "ighub-os-db",
      version: 3,
      // v2 added accounts, the accountant role and fund requests; v3 daily logs and attachments: reseed.
      migrate: () => initialDb() as unknown as Db & Actions,
      // Persist data only, never the action functions.
      partialize: (s) =>
        Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== "function")) as unknown as Db,
    },
  ),
);

// ---------- Derived selectors (pure) ----------

export function userById(users: User[], id?: string) {
  return users.find((u) => u.id === id);
}

/** Weekly penalties derived from attendance: 3+ lates in a Mon–Fri week. */
export function computePenalties(attendance: Attendance[], lateRequests: LateRequest[]): Penalty[] {
  const excused = new Set(
    lateRequests.filter((r) => r.status === "approved").map((r) => `${r.userId}:${r.date}`),
  );
  const counts = new Map<string, number>();
  for (const a of attendance) {
    if (a.status !== "late" || excused.has(`${a.userId}:${a.date}`)) continue;
    const key = `${a.userId}|${weekStart(a.date)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: Penalty[] = [];
  for (const [key, lateCount] of counts) {
    if (lateCount < PENALTY_THRESHOLD) continue;
    const [userId, ws] = key.split("|");
    out.push({ userId, weekStart: ws, lateCount, amount: PENALTY_AMOUNT });
  }
  return out.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export function courseProgress(course: Course, enrollment: Enrollment) {
  if (!course.lessons.length) return 0;
  return Math.round((enrollment.completedLessonIds.length / course.lessons.length) * 100);
}

export function projectProgress(p: Project) {
  if (!p.milestones.length) return p.status === "completed" ? 100 : 0;
  return Math.round((p.milestones.filter((m) => m.done).length / p.milestones.length) * 100);
}
