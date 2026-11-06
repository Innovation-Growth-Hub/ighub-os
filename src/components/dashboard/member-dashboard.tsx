"use client";

import Link from "next/link";
import { AlertTriangle, CircleCheck, Clock, FolderKanban, ListTodo, QrCode } from "lucide-react";
import { computePenalties, PENALTY_THRESHOLD, projectProgress, useDb } from "@/lib/store";
import type { User } from "@/lib/types";
import { formatDate, formatTime, toDateKey, weekStart } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { Progress, StatTile } from "@/components/ui/misc";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { MiniCalendar, RecentActivity, UpcomingSchedule } from "./shared";
import { FundRequestsCard } from "./fund-requests-card";
import { DailyLogCard } from "./daily-log-card";

/** Dashboard for staff, PMs and the accountant (the accountant also gets the fund request queue). */
export function MemberDashboard({ user }: { user: User }) {
  const { attendance, tasks, projects, meetings, lateRequests } = useDb();
  const today = toDateKey(new Date());
  const todayRow = attendance.find((a) => a.userId === user.id && a.date === today);
  const myTasks = tasks.filter((t) => t.assignedTo === user.id);
  const open = myTasks.filter((t) => t.status !== "complete");
  const myProjects = projects.filter((p) => p.teamIds.includes(user.id) || p.managerId === user.id);
  const myMeetings = meetings.filter((m) => m.participantIds.includes(user.id));

  const mine = attendance.filter((a) => a.userId === user.id);
  const thisWeek = weekStart(today);
  const latesThisWeek = mine.filter((a) => a.status === "late" && weekStart(a.date) === thisWeek).length;
  const recent = mine.slice(-20);
  const onTimeRate = recent.length ? Math.round((recent.filter((a) => a.status === "on_time").length / recent.length) * 100) : 0;
  const penalties = computePenalties(mine, lateRequests);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card tone="mint" className="flex flex-col justify-between lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-muted">Today</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">
                {todayRow?.clockOut
                  ? "You're clocked out. See you tomorrow!"
                  : todayRow
                    ? `Clocked in at ${formatTime(todayRow.clockIn!)}`
                    : "You haven't clocked in yet"}
              </p>
              {todayRow && <div className="mt-2"><StatusBadge status={todayRow.status} /></div>}
            </div>
            <span className="hidden size-14 items-center justify-center rounded-full bg-canvas sm:flex">
              <QrCode className="size-7 text-primary-ink" aria-hidden />
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <LinkButton href="/attendance/clock">{todayRow && !todayRow.clockOut ? "Clock out" : "Clock in with QR"}</LinkButton>
            <LinkButton href="/attendance/late-requests" variant="secondary">Request late excuse</LinkButton>
            <LinkButton href="/requests" variant="secondary">Request funds</LinkButton>
          </div>
        </Card>
        <Card>
          <CardHeader title="Lateness this week" />
          <p className="text-4xl font-extrabold">
            {latesThisWeek}
            <span className="text-lg text-muted"> / {PENALTY_THRESHOLD}</span>
          </p>
          <Progress
            value={(latesThisWeek / PENALTY_THRESHOLD) * 100}
            tone={latesThisWeek >= PENALTY_THRESHOLD ? "critical" : latesThisWeek > 0 ? "warning" : "primary"}
            className="mt-4"
            label="Late days this week"
          />
          <p className="mt-3 flex items-start gap-2 text-sm text-muted">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
            {PENALTY_THRESHOLD}+ late days in a week incurs a ₦5,000 penalty.
          </p>
          {penalties.length > 0 && (
            <p className="mt-2 text-xs font-bold text-red-700">{penalties.length} penalty week(s) on record</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Open tasks" value={String(open.length)} icon={ListTodo} />
        <StatTile label="On-time rate (last 20 days)" value={`${onTimeRate}%`} icon={Clock} />
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
