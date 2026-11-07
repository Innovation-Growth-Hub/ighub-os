"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Circle, CircleCheck, FolderX } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { isAdmin } from "@ighub/shared";
import { formatDate, formatNaira } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, Progress, StatTile } from "@/components/ui/misc";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { visibleProjects } from "@ighub/shared";
import { useActions, useProjects, useTasks, useUsers } from "@/lib/api/hooks";
import { projectProgress, userById } from "@/lib/derived";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useCurrentUser();
  const projects = useProjects();
  const users = useUsers();
  const tasks = useTasks();
  const { toggleMilestone } = useActions();
  const project = visibleProjects(projects, user).find((p) => p.id === id);

  if (!project) {
    return <EmptyState icon={FolderX} title="Project not found" action={<Link href="/projects" className="font-bold text-primary-ink">Back to projects</Link>} />;
  }

  const canEdit = isAdmin(user.role) || project.managerId === user.id;
  const showMoney = isAdmin(user.role) || user.role === "project_manager";
  const pm = userById(users, project.managerId);
  const pct = projectProgress(project);
  const burn = project.budget ? Math.round((project.spent / project.budget) * 100) : 0;
  const projectTasks = tasks.filter((t) => t.projectId === project.id);

  return (
    <div className="space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Projects
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-muted">{project.clientName ?? "Internal project"}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{project.name}</h1>
          <p className="mt-2 max-w-2xl text-muted">{project.description}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Progress" value={`${pct}%`} tone="mint" />
        <StatTile label="Timeline" value={formatDate(project.endDate, { year: undefined })} />
        {showMoney && <StatTile label="Budget" value={formatNaira(project.budget)} />}
        {showMoney && <StatTile label="Spent" value={`${burn}%`} />}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Milestones" description={canEdit ? "Tick a milestone when it's delivered." : undefined} />
          <Progress value={pct} className="mb-5" label="Milestone progress" />
          <ol className="space-y-2">
            {project.milestones.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggleMilestone(project.id, m.id)}
                  aria-pressed={m.done}
                  className="flex w-full items-center gap-3 rounded-2xl bg-canvas px-4 py-3 text-left disabled:cursor-default enabled:hover:bg-mint-soft"
                >
                  {m.done ? <CircleCheck className="size-5 text-primary-ink" aria-hidden /> : <Circle className="size-5 text-muted" aria-hidden />}
                  <span className="font-bold">{m.title}</span>
                  <span className="ml-auto text-sm text-muted">{formatDate(m.dueDate)}</span>
                </button>
              </li>
            ))}
            {project.milestones.length === 0 && <p className="text-sm text-muted">No milestones yet.</p>}
          </ol>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="People" />
            <ul className="space-y-3">
              {pm && (
                <li className="flex items-center gap-3"><Avatar name={pm.name} size="sm" /><div className="text-sm"><p className="font-bold">{pm.name}</p><p className="text-xs text-muted">Project manager</p></div></li>
              )}
              {project.teamIds.map((tid) => {
                const u = userById(users, tid);
                return u ? (
                  <li key={tid} className="flex items-center gap-3"><Avatar name={u.name} size="sm" /><div className="text-sm"><p className="font-bold">{u.name}</p><p className="text-xs text-muted">{u.position}</p></div></li>
                ) : null;
              })}
            </ul>
          </Card>
          {showMoney && (
            <Card>
              <CardHeader title="Financial summary" />
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Budget</dt><dd className="font-bold">{formatNaira(project.budget)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Spent</dt><dd className="font-bold">{formatNaira(project.spent)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Remaining</dt><dd className="font-bold">{formatNaira(project.budget - project.spent)}</dd></div>
              </dl>
              <Progress value={burn} tone={burn > 90 ? "critical" : burn > 75 ? "warning" : "primary"} className="mt-4" label="Budget used" />
            </Card>
          )}
        </div>
      </div>

      {user.role !== "client" && (
        <Card>
          <CardHeader title="Tasks" action={<Link href="/tasks" className="text-sm font-bold text-primary-ink hover:underline">Task board</Link>} />
          <ul className="grid gap-2 md:grid-cols-2">
            {projectTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-canvas p-4">
                <div>
                  <p className="text-sm font-bold">{t.title}</p>
                  <p className="text-xs text-muted">{userById(users, t.assignedTo)?.name} · due {formatDate(t.dueDate, { year: undefined })}</p>
                </div>
                <div className="flex gap-1.5"><PriorityBadge priority={t.priority} /><StatusBadge status={t.status} /></div>
              </li>
            ))}
            {projectTasks.length === 0 && <p className="text-sm text-muted">No tasks linked to this project.</p>}
          </ul>
        </Card>
      )}
    </div>
  );
}
