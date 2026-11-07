"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCheck, FolderKanban, ListTodo, Users, Wallet } from "lucide-react";
import { FINANCE, workers } from "@ighub/shared";
import { formatDate, formatNairaCompact, toDateKey } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { Progress, StatTile } from "@/components/ui/misc";
import { Tag } from "@/components/ui/badge";
import { BarList } from "@/components/charts/bar-list";
import { MiniCalendar, RecentActivity, UpcomingSchedule } from "./shared";
import { FundRequestsCard } from "./fund-requests-card";
import { DailyLogCard } from "./daily-log-card";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { useMeetings, useProjects, useTasks, useTransactions, useUsers } from "@/lib/api/hooks";
import { projectProgress, userById } from "@/lib/derived";

/** Super admin and admin overview. Attendance widgets return with the attendance module. */
export function AdminDashboard() {
  const user = useCurrentUser();
  const seesFinance = FINANCE.includes(user.role);
  const users = useUsers();
  const tasks = useTasks();
  const projects = useProjects();
  const transactions = useTransactions(seesFinance);
  const meetings = useMeetings();
  const [today] = useState(() => toDateKey(new Date()));

  const team = workers(users);
  const openTasks = tasks.filter((t) => t.status !== "complete");
  const overdue = openTasks.filter((t) => t.dueDate < today);
  const revenue = transactions.filter((t) => t.kind === "income").reduce((a, t) => a + t.amount, 0);
  const active = projects.filter((p) => p.status === "active");

  const workload = team
    .map((u) => ({ label: u.name, value: openTasks.filter((t) => t.assignedTo === u.id).length }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active team members" value={String(team.length)} icon={Users} tone="mint" />
        <StatTile label="Open tasks" value={String(openTasks.length)} icon={ListTodo} />
        <StatTile label="Overdue tasks" value={String(overdue.length)} icon={AlertTriangle} />
        {seesFinance ? (
          <StatTile label="Revenue recorded" value={formatNairaCompact(revenue)} icon={Wallet} />
        ) : (
          <StatTile label="Active projects" value={String(active.length)} icon={FolderKanban} />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <DailyLogCard user={user} />
        <FundRequestsCard user={user} className="xl:col-span-2" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Active projects"
            description={`${active.length} in progress`}
            action={<Link href="/projects" className="text-sm font-bold text-primary-ink hover:underline">All projects</Link>}
          />
          {active.length === 0 ? (
            <p className="text-sm text-muted">No active projects yet.</p>
          ) : (
            <ul className="space-y-4">
              {active.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="block rounded-2xl bg-canvas p-4 hover:bg-mint-soft">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">{p.name}</p>
                      <span className="text-xs text-muted">{userById(users, p.managerId)?.name}</span>
                    </div>
                    <Progress value={projectProgress(p)} className="mt-2" label={`${p.name} progress`} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <MiniCalendar meetings={meetings} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Open tasks by person" />
          {workload.length ? <BarList data={workload} showShare={false} /> : <p className="text-sm text-muted">No open tasks.</p>}
        </Card>
        <Card>
          <CardHeader title="Tasks" description="Most urgent open tasks" action={<Link href="/tasks" className="text-sm font-bold text-primary-ink hover:underline">Board</Link>} />
          <ul className="space-y-2">
            {openTasks
              .slice()
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .slice(0, 5)
              .map((t) => (
                <li key={t.id} className="rounded-2xl bg-canvas p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold">{t.title}</p>
                    <CheckCheck className="size-4 shrink-0 text-muted" aria-hidden />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={t.dueDate < today ? "text-xs font-bold text-red-700" : "text-xs text-muted"}>
                      Due {formatDate(t.dueDate, { year: undefined })}
                    </span>
                    {t.tags.map((tag) => (
                      <Tag key={tag}>#{tag}</Tag>
                    ))}
                  </div>
                </li>
              ))}
            {openTasks.length === 0 && <p className="text-sm text-muted">Nothing open.</p>}
          </ul>
        </Card>
        <UpcomingSchedule meetings={meetings} />
      </div>

      <RecentActivity />
    </div>
  );
}
