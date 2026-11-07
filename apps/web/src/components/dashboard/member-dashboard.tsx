"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CircleCheck, FolderKanban, ListTodo } from "lucide-react";
import type { User } from "@ighub/shared";
import { formatDate, formatTime, toDateKey } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { Progress, StatTile } from "@/components/ui/misc";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { MiniCalendar, RecentActivity, UpcomingSchedule } from "./shared";
import { FundRequestsCard } from "./fund-requests-card";
import { DailyLogCard } from "./daily-log-card";
import { useMeetings, useProjects, useTasks } from "@/lib/api/hooks";
import { projectProgress } from "@/lib/derived";

/** Dashboard for staff, PMs and the accountant (the accountant also gets the fund request queue). */
export function MemberDashboard({ user }: { user: User }) {
  const tasks = useTasks();
  const projects = useProjects();
  const meetings = useMeetings();
  const [today] = useState(() => toDateKey(new Date()));
  const myTasks = tasks.filter((t) => t.assignedTo === user.id);
  const open = myTasks.filter((t) => t.status !== "complete");
  const overdue = open.filter((t) => t.dueDate < today);
  const myProjects = projects.filter((p) => p.teamIds.includes(user.id) || p.managerId === user.id);
  const myMeetings = meetings.filter((m) => m.participantIds.includes(user.id));
  const nextMeeting = myMeetings.filter((m) => m.status === "scheduled" && m.start >= new Date().toISOString())[0];

  return (
    <div className="space-y-6">
      <Card tone="mint">
        <p className="text-sm font-bold text-muted">Today</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight">
          {open.length === 0 ? "You're all caught up." : `You have ${open.length} open task${open.length === 1 ? "" : "s"}${overdue.length ? `, ${overdue.length} overdue` : ""}.`}
        </p>
        {nextMeeting && (
          <p className="mt-1 text-sm text-muted">Next meeting: {nextMeeting.title}, {formatDate(nextMeeting.start, { weekday: "short", year: undefined })} at {formatTime(nextMeeting.start)}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <LinkButton href="/daily-logs">Log today&apos;s work</LinkButton>
          <LinkButton href="/tasks" variant="secondary">Open my tasks</LinkButton>
          <LinkButton href="/requests" variant="secondary">Request funds</LinkButton>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Open tasks" value={String(open.length)} icon={ListTodo} />
        <StatTile label="Overdue" value={String(overdue.length)} icon={AlertTriangle} />
        <StatTile label="Active projects" value={String(myProjects.filter((p) => p.status === "active").length)} icon={FolderKanban} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <DailyLogCard user={user} />
        <FundRequestsCard user={user} className="xl:col-span-2" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="My tasks" action={<Link href="/tasks" className="text-sm font-bold text-primary-ink hover:underline">Open board</Link>} />
          {open.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted"><CircleCheck className="size-4 text-primary-ink" /> All caught up.</p>
          ) : (
            <ul className="space-y-2">
              {open.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-canvas p-4">
                  <div className="min-w-0">
                    <p className="font-bold">{t.title}</p>
                    <p className="text-xs text-muted">Due {formatDate(t.dueDate)}</p>
                  </div>
                  <div className="flex gap-2">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <MiniCalendar meetings={myMeetings} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="My projects" />
          <ul className="space-y-4">
            {myProjects.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="block rounded-2xl bg-canvas p-4 hover:bg-mint-soft">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">{p.name}</p>
                    <span className="text-xs font-bold">{projectProgress(p)}%</span>
                  </div>
                  <Progress value={projectProgress(p)} className="mt-2" label={`${p.name} progress`} />
                </Link>
              </li>
            ))}
            {myProjects.length === 0 && <p className="text-sm text-muted">Not assigned to any projects.</p>}
          </ul>
        </Card>
        <UpcomingSchedule meetings={myMeetings} />
        <RecentActivity limit={5} />
      </div>
    </div>
  );
}
