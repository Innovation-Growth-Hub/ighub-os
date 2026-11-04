import type { Role } from "@/lib/types";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  staff: "Staff",
  trainer: "Trainer",
  student: "Student",
  client: "Client",
  project_manager: "Project Manager",
  social_media_manager: "Social Media Manager",
};

export const ADMINS: Role[] = ["super_admin", "admin"];

/** Everyone who works at the hub (clocks in, has tasks). */
export const INTERNAL: Role[] = [
  "super_admin",
  "admin",
  "staff",
  "trainer",
  "project_manager",
  "social_media_manager",
];

export const ALL_ROLES = Object.keys(ROLE_LABELS) as Role[];

export function isAdmin(role: Role) {
  return ADMINS.includes(role);
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
  { prefix: "/projects", roles: [...ADMINS, "project_manager", "staff", "client"] },
  { prefix: "/projects/new", roles: [...ADMINS, "project_manager"] },
  { prefix: "/crm", roles: [...ADMINS, "project_manager"] },
  { prefix: "/lms", roles: [...ADMINS, "trainer", "student"] },
  { prefix: "/finance", roles: ADMINS },
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
