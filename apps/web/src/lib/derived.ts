import type { Project, User } from "@ighub/shared";

/** Small pure helpers over API data (formerly in the mock store). */

export function userById<T extends Pick<User, "id">>(users: T[], id?: string) {
  return users.find((u) => u.id === id);
}

export function projectProgress(p: Project) {
  if (!p.milestones.length) return p.status === "completed" ? 100 : 0;
  return Math.round((p.milestones.filter((m) => m.done).length / p.milestones.length) * 100);
}
