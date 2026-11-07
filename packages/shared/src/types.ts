/**
 * Domain types. These mirror the PRD §8 schema and are the contract the
 * Node/MySQL backend will implement later — keep them in sync with the API.
 */

export type Role =
  | "super_admin"
  | "admin"
  | "staff"
  | "trainer"
  | "student"
  | "client"
  | "project_manager"
  | "accountant"
  | "social_media_manager";

export type StaffType = "core_team" | "corper" | "intern";

export type OfficeLocation = "umuahia_hq" | "aba_hub";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: string;
  phone?: string;
  staffType?: StaffType;
  officeLocation?: OfficeLocation;
  isActive: boolean;
  joinedAt: string;
  company?: string; // clients
  /** Set when the super admin creates the account or resets its password. */
  mustChangePassword?: boolean;
}

export type AttendanceStatus = "on_time" | "late" | "absent";

export interface Attendance {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  clockIn?: string; // ISO
  clockOut?: string; // ISO
  officeLocation: OfficeLocation;
  status: AttendanceStatus;
}

export type RequestStatus = "pending" | "approved" | "rejected";

export interface LateRequest {
  id: string;
  userId: string;
  date: string;
  reason: string;
  status: RequestStatus;
  createdAt: string;
}

export interface Penalty {
  userId: string;
  weekStart: string;
  lateCount: number;
  amount: number;
}

export type TaskStatus = "pending" | "in_progress" | "complete";
export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  createdBy: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  projectId?: string;
  tags: string[];
}

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  /** Client organisation (free text until client accounts launch). */
  clientName?: string;
  managerId: string;
  teamIds: string[];
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  status: ProjectStatus;
  milestones: Milestone[];
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  segment: "corporate" | "government" | "startup" | "ngo";
  lastContactedAt: string;
}

export type DealStage = "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export interface Deal {
  id: string;
  name: string;
  contactId: string;
  stage: DealStage;
  value: number;
  probability: number;
}

export interface Communication {
  id: string;
  contactId: string;
  type: "call" | "email" | "meeting";
  summary: string;
  at: string;
}

export interface Lesson {
  id: string;
  title: string;
  durationMin: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  trainerId: string;
  startDate: string;
  endDate: string;
  category: string;
  lessons: Lesson[];
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  completedLessonIds: string[];
  grade?: number;
}

export type TransactionKind = "income" | "expense";

export interface Transaction {
  id: string;
  kind: TransactionKind;
  amount: number;
  category: string; // income source or expense category
  date: string;
  description: string;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface Invoice {
  id: string;
  number: string;
  /** CRM contact billed, if any. */
  contactId?: string;
  clientName: string;
  amount: number;
  issuedAt: string;
  dueAt: string;
  status: InvoiceStatus;
}

export type DocumentCategory = "contracts" | "proposals" | "reports" | "training";

export interface DocumentFile {
  id: string;
  name: string;
  category: DocumentCategory;
  sizeKb: number;
  ownerId: string;
  updatedAt: string;
  version: number;
  sharedWith: string[];
}

export type MeetingStatus = "scheduled" | "completed" | "cancelled";

export interface Meeting {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  location: string;
  participantIds: string[];
  agenda: string[];
  status: MeetingStatus;
}

export type SocialPlatform = "instagram" | "x" | "linkedin" | "facebook";

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  handle: string;
  followers: number;
}

export interface SocialPost {
  id: string;
  accountId: string;
  content: string;
  scheduledAt: string;
  publishedAt?: string;
  likes?: number;
  shares?: number;
}

export interface Activity {
  id: string;
  actorId: string;
  message: string;
  at: string;
}

/**
 * Fund request flow:
 * staff submits → accountant reviews (forward or reject) → super admin
 * decides (approve or reject) → accountant disburses (records the expense).
 */
export type FundRequestStatus = "pending_review" | "forwarded" | "approved" | "rejected" | "disbursed";

export interface FundRequestEvent {
  at: string;
  actorId: string;
  action: "submitted" | "forwarded" | "approved" | "rejected" | "disbursed";
  note?: string;
}

/** Reviewer actions on a fund request. Who may take which is in fund-requests.ts. */
export type FundRequestDecision = Exclude<FundRequestEvent["action"], "submitted">;

export interface FundRequest {
  id: string;
  requesterId: string;
  title: string;
  purpose: string;
  amount: number;
  category: string; // one of EXPENSE_CATEGORIES
  neededBy: string; // YYYY-MM-DD
  projectId?: string;
  status: FundRequestStatus;
  createdAt: string;
  history: FundRequestEvent[];
  attachments: FundRequestAttachment[];
}

/** Quotes go in with the request; receipts come back after the money is spent. */
export interface FundRequestAttachment {
  id: string;
  kind: "quote" | "receipt";
  name: string;
  sizeKb: number;
  uploadedBy: string;
  uploadedAt: string;
}

/**
 * Daily work log (PRD §6.3 "Create daily reports"). One per person per day,
 * editable until the day ends. The super admin can read every log.
 */
export interface DailyLogEntry {
  id: string;
  description: string;
  hours?: number;
  taskId?: string;
}

export interface DailyLog {
  id: string; // `log_${userId}_${date}`
  userId: string;
  date: string; // YYYY-MM-DD
  entries: DailyLogEntry[];
  blockers?: string;
  updatedAt: string;
}
