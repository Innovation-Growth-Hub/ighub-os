import { isAdmin } from "@/lib/auth/roles";
import type { Project, User } from "@/lib/types";

/** Row-level visibility for projects (mirrors the future API policy). */
export function visibleProjects(projects: Project[], user: User) {
  if (isAdmin(user.role)) return projects;
  if (user.role === "client") return projects.filter((p) => p.clientId === user.id);
  return projects.filter((p) => p.managerId === user.id || p.teamIds.includes(user.id));
}
