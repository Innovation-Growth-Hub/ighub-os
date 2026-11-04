"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { computePenalties, projectProgress, useDb } from "@/lib/store";
import { attendanceDates, dailyPresence, workers } from "@/lib/attendance";
import { STAFF_TYPE_LABELS } from "@/components/staff/staff-form";
import { formatNaira, formatNairaCompact } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader, Pills, Progress, StatTile } from "@/components/ui/misc";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";
import { ColumnChart } from "@/components/charts/column-chart";

type Range = "10" | "20" | "30";

function downloadCsv(rows: Array<Array<string | number>>, filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { users, attendance, lateRequests, tasks, projects, transactions } = useDb();
  const [range, setRange] = useState<Range>("20");
  const days = new Set(attendanceDates(attendance).slice(0, Number(range)));
  const inRange = attendance.filter((a) => days.has(a.date));
  const penalties = computePenalties(inRange, lateRequests);

  const rows = workers(users).map((u) => {
    const mine = inRange.filter((a) => a.userId === u.id);
    const c = (s: string) => mine.filter((a) => a.status === s).length;
    const rate = mine.length ? Math.round((c("on_time") / mine.length) * 100) : 0;
    const owed = penalties.filter((p) => p.userId === u.id).reduce((a, p) => a + p.amount, 0);
    const done = tasks.filter((t) => t.assignedTo === u.id && t.status === "complete").length;
    return { u, onTime: c("on_time"), late: c("late"), absent: c("absent"), rate, owed, done };
  });

  const overallRate = inRange.length ? Math.round((inRange.filter((a) => a.status === "on_time").length / inRange.length) * 100) : 0;
  const revenue = transactions.filter((t) => t.kind === "income").reduce((a, t) => a + t.amount, 0);
  const spend = transactions.filter((t) => t.kind === "expense").reduce((a, t) => a + t.amount, 0);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Attendance, team performance and financial summaries"
        actions={
          <>
            <Pills label="Range" value={range} onChange={setRange} options={[{ value: "10", label: "10 days" }, { value: "20", label: "20 days" }, { value: "30", label: "30 days" }]} />
            <Button
              variant="secondary"
              onClick={() =>
                downloadCsv(
                  [["Name", "Type", "On time", "Late", "Absent", "On-time %", "Penalties (NGN)", "Tasks done"], ...rows.map((r) => [r.u.name, r.u.staffType ?? "", r.onTime, r.late, r.absent, r.rate, r.owed, r.done])],
                  `ighub-attendance-report-${range}d.csv`,
                )
              }
            >
              <Download className="size-4" /> Export CSV
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={`On-time rate · ${range} days`} value={`${overallRate}%`} tone="mint" />
        <StatTile label="Penalties issued" value={formatNaira(penalties.reduce((a, p) => a + p.amount, 0))} />
        <StatTile label="Tasks completed" value={String(tasks.filter((t) => t.status === "complete").length)} />
        <StatTile label="Net profit (YTD)" value={formatNairaCompact(revenue - spend)} />
      </div>

      <Card className="mt-6">
        <CardHeader title="On-time clock-ins per day" description={`Last ${range} working days`} />
        <ColumnChart data={dailyPresence(attendance, Number(range)).map((d) => ({ label: d.label.split(" ")[1] ?? d.label, value: d.onTime }))} caption="On-time clock-ins per day" />
      </Card>

      <Card className="mt-6">
        <CardHeader title="Attendance by team member" />
        <Table>
          <THead>
            <tr><Th>Name</Th><Th>Type</Th><Th>On time</Th><Th>Late</Th><Th>Absent</Th><Th>On-time rate</Th><Th>Penalties</Th></tr>
          </THead>
          <tbody>
            {rows.sort((a, b) => b.rate - a.rate).map((r) => (
              <Tr key={r.u.id}>
                <Td className="font-bold whitespace-nowrap">{r.u.name}</Td>
                <Td className="whitespace-nowrap text-muted">{r.u.staffType ? STAFF_TYPE_LABELS[r.u.staffType] : "—"}</Td>
                <Td>{r.onTime}</Td>
                <Td>{r.late}</Td>
                <Td>{r.absent}</Td>
                <Td className="min-w-40"><div className="flex items-center gap-3"><Progress value={r.rate} tone={r.rate < 60 ? "warning" : "primary"} label={`${r.u.name} on-time rate`} /><span className="w-9 text-xs font-bold">{r.rate}%</span></div></Td>
                <Td className="font-bold whitespace-nowrap">{r.owed ? formatNaira(r.owed) : "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Project health" />
        <Table>
          <THead>
            <tr><Th>Project</Th><Th>Progress</Th><Th>Budget used</Th><Th>Ends</Th></tr>
          </THead>
          <tbody>
            {projects.map((p) => {
              const burn = p.budget ? Math.round((p.spent / p.budget) * 100) : 0;
              return (
                <Tr key={p.id}>
                  <Td className="font-bold">{p.name}</Td>
                  <Td className="min-w-40"><div className="flex items-center gap-3"><Progress value={projectProgress(p)} label={`${p.name} progress`} /><span className="w-9 text-xs font-bold">{projectProgress(p)}%</span></div></Td>
                  <Td className="min-w-40"><div className="flex items-center gap-3"><Progress value={burn} tone={burn > 90 ? "critical" : burn > 75 ? "warning" : "primary"} label={`${p.name} budget used`} /><span className="w-9 text-xs font-bold">{burn}%</span></div></Td>
                  <Td className="whitespace-nowrap text-muted">{p.endDate}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
