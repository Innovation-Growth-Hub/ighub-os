/**
 * Domain types. These mirror the PRD §8 schema and are the contract the
 * Node/Postgres backend will implement later — keep them in sync with the API.
 */

export type Role =
  | "super_admin"
  | "admin"
  | "staff"
  | "trainer"
  | "student"
  | "client"
  | "project_manager"
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
  clientId?: string;
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
  clientId: string;
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
