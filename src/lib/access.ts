import { isAdmin } from "@/lib/auth/roles";
import { workers } from "@/lib/attendance";
import type { Project, Task, User } from "@/lib/types";

/** Row-level visibility for projects (mirrors the future API policy). */
export function visibleProjects(projects: Project[], user: User) {
  if (isAdmin(user.role)) return projects;
  if (user.role === "client") return projects.filter((p) => p.clientId === user.id);
  return projects.filter((p) => p.managerId === user.id || p.teamIds.includes(user.id));
}

/** Projects a project manager runs. */
export function managedProjects(projects: Project[], user: User) {
  return projects.filter((p) => p.managerId === user.id);
}

/**
 * Who this user may assign tasks to. Admins: anyone active. PMs: people on the
 * projects they manage (and themselves). Everyone else: nobody.
 */
export function assignableUsers(users: User[], projects: Project[], user: User) {
  const active = workers(users);
  if (isAdmin(user.role)) return active;
  if (user.role !== "project_manager") return [];
  const ids = new Set([user.id, ...managedProjects(projects, user).flatMap((p) => p.teamIds)]);
  return active.filter((u) => ids.has(u.id));
}

/** Tasks this user can manage (edit status of anyone's, delete). */
export function canManageTask(task: Task, projects: Project[], user: User) {
  if (isAdmin(user.role)) return true;
  if (user.role !== "project_manager") return false;
  if (task.createdBy === user.id) return true;
  return managedProjects(projects, user).some((p) => p.id === task.projectId);
}
