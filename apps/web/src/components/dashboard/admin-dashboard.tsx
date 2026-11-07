"use client";

import Link from "next/link";
import { CheckCheck, Clock, ListTodo, Users, Wallet } from "lucide-react";
import { useDb, userById } from "@/lib/store";
import { attendanceDates, dailyPresence, onTimeHeatmap, workers } from "@/lib/attendance";
import { OFFICES } from "@/lib/mock/seed";
import { formatDate, formatNairaCompact, formatTime } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, Progress, StatTile } from "@/components/ui/misc";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { ColumnChart } from "@/components/charts/column-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { BarList } from "@/components/charts/bar-list";
import { MiniCalendar, RecentActivity, UpcomingSchedule } from "./shared";
import { FundRequestsCard } from "./fund-requests-card";
import { DailyLogCard } from "./daily-log-card";
import { useCurrentUser } from "@/lib/auth/auth-client";

const SATISFACTION = 73; // PRD §7.1 — from the quarterly pulse survey (mock)

export function AdminDashboard() {
  const user = useCurrentUser();
  const { users, attendance, tasks, transactions, meetings } = useDb();
  const team = workers(users);
  const latestDate = attendanceDates(attendance)[0];
  const latest = attendance.filter((a) => a.date === latestDate);
  const onTimeRate = latest.length
    ? Math.round((latest.filter((a) => a.status === "on_time").length / latest.length) * 100)
    : 0;
  const openTasks = tasks.filter((t) => t.status !== "complete");
  const revenue = transactions.filter((t) => t.kind === "income").reduce((a, t) => a + t.amount, 0);
  const presence = dailyPresence(attendance, 10);
  const heat = onTimeHeatmap(attendance, 6);

  const recentDates = new Set(attendanceDates(attendance).slice(0, 20));
  const punctuality = team
    .map((u) => {
      const rows = attendance.filter((a) => a.userId === u.id && recentDates.has(a.date));
      return {
        label: u.name,
        value: rows.length ? Math.round((rows.filter((a) => a.status === "on_time").length / rows.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active team members" value={String(team.length)} icon={Users} tone="mint" />
        <StatTile label="On-time rate (latest day)" value={`${onTimeRate}%`} icon={Clock} delta={4} deltaLabel="vs last week" />
        <StatTile label="Open tasks" value={String(openTasks.length)} icon={ListTodo} delta={-12} deltaLabel="vs last week" upIsGood={false} />
        <StatTile label="Revenue (YTD)" value={formatNairaCompact(revenue)} icon={Wallet} delta={18} deltaLabel="vs last year" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <DailyLogCard user={user} />
        <FundRequestsCard user={user} className="xl:col-span-2" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Daily attendance" description="Team members present, last 10 working days" />
          <ColumnChart data={presence.map((p) => ({ label: p.label, value: p.present }))} caption="Team members present per day" />
        </Card>
        <MiniCalendar meetings={meetings} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="On-time heatmap" description="Share of clock-ins before 9:00 by weekday, last 6 weeks" />
          <Heatmap rows={heat.rows} columns={heat.columns} values={heat.values} caption="On-time rate by weekday and week" />
        </Card>
        <Card>
          <CardHeader title="Employee satisfaction" description="Q3 pulse survey" />
          <p className="text-5xl font-extrabold tracking-tight">{SATISFACTION}%</p>
          <p className="mt-1 text-sm text-muted">of the team are satisfied or very satisfied</p>
          <Progress value={SATISFACTION} className="mt-5 h-3" label="Employee satisfaction" />
          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            {[
              ["Workload", "68%"],
              ["Growth", "81%"],
              ["Tools", "70%"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-canvas p-3">
                <p className="text-lg font-extrabold">{v}</p>
                <p className="text-[11px] font-semibold text-muted">{k}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Employee attendance"
            description={latestDate ? formatDate(latestDate, { weekday: "long" }) : undefined}
            action={<Link href="/attendance" className="text-sm font-bold text-primary-ink hover:underline">Open attendance</Link>}
          />
          <Table>
            <THead>
              <tr>
                <Th>Name</Th>
                <Th>Office</Th>
                <Th>Clock in</Th>
                <Th>Clock out</Th>
                <Th>Status</Th>
              </tr>
            </THead>
            <tbody>
              {latest.slice(0, 8).map((a) => {
                const u = userById(users, a.userId);
                return (
                  <Tr key={a.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={u?.name ?? "?"} size="sm" />
                        <span className="font-bold whitespace-nowrap">{u?.name}</span>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-muted">{OFFICES[a.officeLocation]}</Td>
                    <Td>{a.clockIn ? formatTime(a.clockIn) : "—"}</Td>
                    <Td>{a.clockOut ? formatTime(a.clockOut) : "—"}</Td>
                    <Td><StatusBadge status={a.status} /></Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
        <UpcomingSchedule meetings={meetings} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Team performance" description="Top on-time rates, last 20 working days" />
          <BarList data={punctuality} showShare={false} max={100} format={(v) => `${v}%`} />
        </Card>
        <Card>
          <CardHeader title="Tasks" description="Most urgent open tasks" action={<Link href="/tasks" className="text-sm font-bold text-primary-ink hover:underline">Board</Link>} />
          <ul className="space-y-2">
            {openTasks
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .slice(0, 5)
              .map((t) => (
                <li key={t.id} className="rounded-2xl bg-canvas p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold">{t.title}</p>
                    <CheckCheck className="size-4 shrink-0 text-muted" aria-hidden />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted">Due {formatDate(t.dueDate, { year: undefined })}</span>
                    {t.tags.map((tag) => (
                      <Tag key={tag}>#{tag}</Tag>
                    ))}
                  </div>
                </li>
              ))}
          </ul>
        </Card>
        <RecentActivity />
      </div>
    </div>
  );
}
