"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CircleCheck, CircleX, Clock, Download, Hourglass } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { isAdmin } from "@/lib/auth/roles";
import { computePenalties, PENALTY_AMOUNT, PENALTY_THRESHOLD, useDb, userById } from "@/lib/store";
import { attendanceDates, dailyPresence } from "@/lib/attendance";
import { OFFICES } from "@/lib/mock/seed";
import type { OfficeLocation } from "@/lib/types";
import { formatDate, formatNaira, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Avatar, PageHeader, StatTile } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { ColumnChart } from "@/components/charts/column-chart";
import { AttendanceTabs } from "@/components/attendance/attendance-tabs";

export default function AttendancePage() {
  const user = useCurrentUser();
  return (
    <>
      <PageHeader title="Attendance" description={`QR clock-in · late after 9:00 · ${PENALTY_THRESHOLD}+ lates/week = ${formatNaira(PENALTY_AMOUNT)} penalty`} />
      <AttendanceTabs />
      {isAdmin(user.role) ? <AdminOverview /> : <MyAttendance userId={user.id} />}
    </>
  );
}

function exportCsv(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function AdminOverview() {
  const { attendance, users, lateRequests } = useDb();
  const dates = attendanceDates(attendance);
  const [date, setDate] = useState(dates[0] ?? "");
  const [office, setOffice] = useState<"all" | OfficeLocation>("all");
  const day = attendance.filter((a) => a.date === date && (office === "all" || a.officeLocation === office));
  const n = (s: string) => day.filter((a) => a.status === s).length;
  const penalties = computePenalties(attendance, lateRequests).slice(0, 8);
  const pending = lateRequests.filter((r) => r.status === "pending").length;
  const week = dailyPresence(attendance, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="On time" value={String(n("on_time"))} icon={CircleCheck} tone="mint" />
        <StatTile label="Late" value={String(n("late"))} icon={Clock} />
        <StatTile label="Absent" value={String(n("absent"))} icon={CircleX} />
        <Link href="/attendance/late-requests" className="rounded-3xl bg-surface p-6 hover:bg-surface-2">
          <p className="flex items-center justify-between text-sm font-semibold text-muted">
            Pending late requests <Hourglass className="size-4.5 text-primary-ink" />
          </p>
          <p className="mt-3 text-3xl font-extrabold">{pending}</p>
          <p className="mt-2 text-xs font-bold text-primary-ink">Review →</p>
        </Link>
      </div>

      <Card>
        <CardHeader
          title="Daily register"
          description={date ? formatDate(date, { weekday: "long" }) : undefined}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                exportCsv(
                  [["Name", "Office", "Date", "Clock in", "Clock out", "Status"], ...day.map((a) => [userById(users, a.userId)?.name ?? "", OFFICES[a.officeLocation], a.date, a.clockIn ? formatTime(a.clockIn) : "", a.clockOut ? formatTime(a.clockOut) : "", a.status])],
                  `attendance-${date}.csv`,
                )
              }
            >
              <Download className="size-4" /> Export CSV
            </Button>
          }
        />
        <div className="mb-4 flex flex-wrap gap-3">
          <label className="w-56">
            <span className="sr-only">Date</span>
            <Select value={date} onChange={(e) => setDate(e.target.value)} className="bg-canvas">
              {dates.slice(0, 30).map((d) => (
                <option key={d} value={d}>{formatDate(d, { weekday: "short" })}</option>
              ))}
            </Select>
          </label>
          <label className="w-48">
            <span className="sr-only">Office</span>
            <Select value={office} onChange={(e) => setOffice(e.target.value as typeof office)} className="bg-canvas">
              <option value="all">All offices</option>
              {Object.entries(OFFICES).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </label>
        </div>
        <Table>
          <THead>
            <tr><Th>Name</Th><Th>Office</Th><Th>Clock in</Th><Th>Clock out</Th><Th>Status</Th></tr>
          </THead>
          <tbody>
            {day.map((a) => {
              const u = userById(users, a.userId);
              return (
                <Tr key={a.id}>
                  <Td><div className="flex items-center gap-3"><Avatar name={u?.name ?? "?"} size="sm" /><span className="font-bold whitespace-nowrap">{u?.name}</span></div></Td>
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

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Late arrivals" description="Late clock-ins per day, last 5 working days" />
          <ColumnChart data={week.map((d) => ({ label: d.label, value: d.late }))} caption="Late clock-ins per day" />
        </Card>
        <Card>
          <CardHeader title="Penalties" description={`${PENALTY_THRESHOLD}+ unexcused lates in a week`} />
          {penalties.length === 0 ? (
            <p className="text-sm text-muted">No penalties. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {penalties.map((p) => (
                <li key={`${p.userId}${p.weekStart}`} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
                  <AlertTriangle className="size-4 text-red-700" aria-hidden />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-bold">{userById(users, p.userId)?.name}</p>
                    <p className="text-xs text-muted">Week of {formatDate(p.weekStart)} · {p.lateCount} late days</p>
                  </div>
                  <span className="font-extrabold">{formatNaira(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function MyAttendance({ userId }: { userId: string }) {
  const { attendance, lateRequests } = useDb();
  const mine = attendance.filter((a) => a.userId === userId).sort((a, b) => b.date.localeCompare(a.date));
  const penalties = computePenalties(mine, lateRequests);
  const last20 = mine.slice(0, 20);
  const pct = (s: string) => (last20.length ? Math.round((last20.filter((a) => a.status === s).length / last20.length) * 100) : 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatTile label="On time (last 20 days)" value={`${pct("on_time")}%`} icon={CircleCheck} tone="mint" />
        <StatTile label="Late" value={`${pct("late")}%`} icon={Clock} />
        <StatTile label="Absent" value={`${pct("absent")}%`} icon={CircleX} />
        <StatTile label="Penalties owed" value={formatNaira(penalties.reduce((a, p) => a + p.amount, 0))} icon={AlertTriangle} />
      </div>
      <Card>
        <CardHeader title="History" />
        <Table>
          <THead>
            <tr><Th>Date</Th><Th>Office</Th><Th>Clock in</Th><Th>Clock out</Th><Th>Status</Th></tr>
          </THead>
          <tbody>
            {mine.slice(0, 25).map((a) => (
              <Tr key={a.id}>
                <Td className="font-semibold whitespace-nowrap">{formatDate(a.date, { weekday: "short" })}</Td>
                <Td className="whitespace-nowrap text-muted">{OFFICES[a.officeLocation]}</Td>
                <Td>{a.clockIn ? formatTime(a.clockIn) : "—"}</Td>
                <Td>{a.clockOut ? formatTime(a.clockOut) : "—"}</Td>
                <Td><StatusBadge status={a.status} /></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
