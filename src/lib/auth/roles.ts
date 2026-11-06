import type { Role } from "@/lib/types";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Staff",
  project_manager: "Project Manager",
  accountant: "Accountant",
  social_media_manager: "Social Media Manager",
  trainer: "Trainer",
  student: "Student",
  client: "Client",
};

/** Roles that can sign in today. */
export const LIVE_ROLES: Role[] = ["super_admin", "admin", "staff", "project_manager", "accountant"];

/** Roles planned but not launched yet: no account creation, no sign-in. */
export const COMING_SOON_ROLES: Role[] = ["social_media_manager", "trainer", "student", "client"];

export function isComingSoon(role: Role) {
  return COMING_SOON_ROLES.includes(role);
}

export const ADMINS: Role[] = ["super_admin", "admin"];

/** Everyone who works at the hub (clocks in, has tasks, can request funds). */
export const INTERNAL: Role[] = [
  "super_admin",
  "admin",
  "staff",
  "project_manager",
  "accountant",
  "trainer",
  "social_media_manager",
];

/** Who sees the company books. */
export const FINANCE: Role[] = ["super_admin", "admin", "accountant"];

/** Who records income and expenses (admins can only view). */
export function canRecordFinance(role: Role) {
  return role === "super_admin" || role === "accountant";
}

/** Everyone internal writes a daily log, except the super admin, who reads them all. */
export function writesDailyLog(role: Role) {
  return INTERNAL.includes(role) && role !== "super_admin";
}

export function canViewAllDailyLogs(role: Role) {
  return role === "super_admin";
}

export const ALL_ROLES = Object.keys(ROLE_LABELS) as Role[];

export function isAdmin(role: Role) {
  return ADMINS.includes(role);
}

export function isSuperAdmin(role: Role) {
  return role === "super_admin";
}

/** Only the super admin creates, edits, deactivates and resets accounts. */
export const canManageAccounts = isSuperAdmin;

/** Admins and project managers schedule meetings; everyone else is invited. */
export function canScheduleMeetings(role: Role) {
  return isAdmin(role) || role === "project_manager";
}

/**
 * Admins and project managers create and assign tasks; staff update their own.
 * PMs are limited to people and tasks on their projects (see lib/access.ts).
 */
export function canManageTasks(role: Role) {
  return isAdmin(role) || role === "project_manager";
}

/**
 * Route access by path prefix. The most specific (longest) match wins.
 * When Better Auth lands, the same table drives the server-side check.
 */
export const ROUTE_ACCESS: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/dashboard", roles: ALL_ROLES },
  { prefix: "/settings", roles: ALL_ROLES },
  { prefix: "/staff", roles: ADMINS },
  { prefix: "/attendance", roles: INTERNAL },
  { prefix: "/attendance/qr", roles: ADMINS },
  { prefix: "/tasks", roles: INTERNAL },
  { prefix: "/projects", roles: [...INTERNAL, "client"] },
  { prefix: "/projects/new", roles: [...ADMINS, "project_manager"] },
  { prefix: "/crm", roles: [...ADMINS, "project_manager"] },
  { prefix: "/lms", roles: [...ADMINS, "trainer", "student"] },
  { prefix: "/requests", roles: INTERNAL },
  { prefix: "/daily-logs", roles: INTERNAL },
  { prefix: "/finance", roles: FINANCE },
  { prefix: "/documents", roles: INTERNAL },
  { prefix: "/meetings", roles: INTERNAL },
  { prefix: "/social", roles: [...ADMINS, "social_media_manager"] },
  { prefix: "/reports", roles: ADMINS },
  { prefix: "/insights", roles: ADMINS },
];

export function canAccess(role: Role, pathname: string) {
  const match = ROUTE_ACCESS.filter(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  ).sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match ? match.roles.includes(role) : true;
}
