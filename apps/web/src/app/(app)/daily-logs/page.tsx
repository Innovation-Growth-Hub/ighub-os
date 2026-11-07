"use client";

import { useState, type FormEvent } from "react";
import { CircleCheck, ClipboardList, Eye, Plus, Trash2, UserX } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { canViewAllDailyLogs, isComingSoon, writesDailyLog } from "@ighub/shared";
import { workers } from "@/lib/attendance";
import { useDb, userById } from "@/lib/store";
import type { DailyLog, User } from "@ighub/shared";
import { cn, formatDate, toDateKey, uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Avatar, EmptyState, PageHeader, StatTile } from "@/components/ui/misc";
import { LogCard, totalHours } from "@/components/daily-logs/log-card";

export default function DailyLogsPage() {
  const user = useCurrentUser();
  if (canViewAllDailyLogs(user.role)) return <TeamLogs />;
  if (writesDailyLog(user.role)) return <MyLogs user={user} />;
  return <EmptyState icon={ClipboardList} title="Daily logs aren't available for your role" />;
}

// ---------- Staff: write today's log, read past ones ----------

type Row = { id: string; description: string; hours: string; taskId: string };

const toRows = (log?: DailyLog): Row[] =>
  log?.entries.length
    ? log.entries.map((e) => ({ id: e.id, description: e.description, hours: e.hours?.toString() ?? "", taskId: e.taskId ?? "" }))
    : [{ id: uid("le"), description: "", hours: "", taskId: "" }];

function MyLogs({ user }: { user: User }) {
  const { dailyLogs, tasks, saveDailyLog } = useDb();
  const [today] = useState(() => toDateKey(new Date()));
  const existing = dailyLogs.find((l) => l.userId === user.id && l.date === today);
  const [rows, setRows] = useState<Row[]>(() => toRows(existing));
  const [blockers, setBlockers] = useState(existing?.blockers ?? "");
  const [saved, setSaved] = useState(false);

  const myTasks = tasks.filter((t) => t.assignedTo === user.id);
  const history = dailyLogs.filter((l) => l.userId === user.id && l.date !== today).sort((a, b) => b.date.localeCompare(a.date));

  const update = (id: string, patch: Partial<Row>) => {
    setSaved(false);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  function onSave(e: FormEvent) {
    e.preventDefault();
    const entries = rows
      .filter((r) => r.description.trim())
      .map((r) => ({
        id: r.id,
        description: r.description.trim(),
        hours: r.hours ? Number(r.hours) : undefined,
        taskId: r.taskId || undefined,
      }));
    if (!entries.length) return;
    saveDailyLog(user.id, today, entries, blockers.trim());
    setSaved(true);
  }

  return (
    <>
      <PageHeader title="Daily log" description="What you worked on today. You can edit it until the end of the day. The super admin can read it." />

      <Card className="max-w-3xl">
        <CardHeader
          title={`Today · ${formatDate(today, { weekday: "long", year: undefined })}`}
          description={existing ? "Submitted. Changes save over today's log." : "Not submitted yet."}
        />
        <form onSubmit={onSave} className="space-y-4">
          <ul className="space-y-3">
            {rows.map((r, i) => (
              <li key={r.id} className="grid gap-2 rounded-3xl bg-canvas p-4 sm:grid-cols-[1fr_6rem_auto]">
                <div className="space-y-2">
                  <label className="sr-only" htmlFor={`d-${r.id}`}>Task {i + 1}</label>
                  <Input
                    id={`d-${r.id}`}
                    placeholder="e.g. Built the KYC selfie step"
                    value={r.description}
                    onChange={(e) => update(r.id, { description: e.target.value })}
                    required={i === 0}
                  />
                  <label className="sr-only" htmlFor={`t-${r.id}`}>Linked task for item {i + 1}</label>
                  <Select id={`t-${r.id}`} value={r.taskId} onChange={(e) => update(r.id, { taskId: e.target.value })} className="h-9 text-xs">
                    <option value="">Not linked to a board task</option>
                    {myTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="sr-only" htmlFor={`h-${r.id}`}>Hours for item {i + 1}</label>
                  <Input id={`h-${r.id}`} type="number" min={0} max={24} step={0.5} placeholder="Hours" value={r.hours} onChange={(e) => update(r.id, { hours: e.target.value })} />
                </div>
                <button
                  type="button"
                  aria-label={`Remove item ${i + 1}`}
                  disabled={rows.length === 1}
                  onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                  className="flex size-11 items-center justify-center rounded-full text-red-700 hover:bg-red-50 disabled:opacity-30"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" onClick={() => setRows((rs) => [...rs, { id: uid("le"), description: "", hours: "", taskId: "" }])}>
            <Plus className="size-4" /> Add another
          </Button>
          <Field label="Blockers (optional)" htmlFor="blockers" hint="Anything stopping you that someone should know about.">
            <Textarea id="blockers" value={blockers} onChange={(e) => { setSaved(false); setBlockers(e.target.value); }} className="bg-canvas" />
          </Field>
          <div className="flex items-center gap-4">
            <Button type="submit">{existing ? "Update today's log" : "Submit log"}</Button>
            {saved && <span className="flex items-center gap-1 text-sm font-bold text-primary-ink"><CircleCheck className="size-4" /> Saved</span>}
          </div>
        </form>
      </Card>

      <h2 className="mt-10 mb-4 text-lg font-extrabold">Previous days</h2>
      {history.length === 0 ? (
        <p className="text-sm text-muted">Your past logs will show here.</p>
      ) : (
        <div className="grid max-w-3xl gap-4">
          {history.map((l) => <LogCard key={l.id} log={l} tasks={tasks} />)}
        </div>
      )}
    </>
  );
}

// ---------- Super admin: read-only view of everyone's logs ----------

function TeamLogs() {
  const { dailyLogs, users, tasks } = useDb();
  const [today] = useState(() => toDateKey(new Date()));
  const [date, setDate] = useState(today);
  const [person, setPerson] = useState("all");

  // Everyone expected to log: active, internal, live roles (not the super admin).
  const team = workers(users).filter((u) => writesDailyLog(u.role) && !isComingSoon(u.role));
  const recentDates = [...new Set([today, ...dailyLogs.map((l) => l.date)])].sort().reverse().slice(0, 6);
  const onDate = dailyLogs.filter((l) => l.date === date);
  const shown =
    person === "all"
      ? onDate
      : dailyLogs.filter((l) => l.userId === person).sort((a, b) => b.date.localeCompare(a.date));
  const missing = team.filter((u) => !onDate.some((l) => l.userId === u.id));
  const blockers = onDate.filter((l) => l.blockers).length;

  return (
    <>
      <PageHeader
        title="Daily logs"
        description="What the team worked on each day."
        actions={<span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-4 py-2 text-sm font-bold text-muted"><Eye className="size-4" /> View only</span>}
      />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Recent days">
          {recentDates.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={person === "all" && date === d}
              onClick={() => { setDate(d); setPerson("all"); }}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors",
                person === "all" && date === d ? "bg-mint text-ink" : "bg-surface-2 text-muted hover:text-ink",
              )}
            >
              {d === today ? "Today" : formatDate(d, { weekday: "short", year: undefined })}
              <span className="text-xs opacity-70">{dailyLogs.filter((l) => l.date === d).length}</span>
            </button>
          ))}
        </div>
        <label className="ml-auto">
          <span className="sr-only">Pick a date</span>
          <Input type="date" value={date} max={today} onChange={(e) => { setDate(e.target.value); setPerson("all"); }} className="h-9 w-44 rounded-full" />
        </label>
        <label>
          <span className="sr-only">Filter by person</span>
          <Select value={person} onChange={(e) => setPerson(e.target.value)} className="h-9 w-52 rounded-full">
            <option value="all">Everyone on this day</option>
            {team.map((u) => <option key={u.id} value={u.id}>{u.name} (all days)</option>)}
          </Select>
        </label>
      </div>

      {person === "all" && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatTile label="Logs submitted" value={`${onDate.length} / ${team.length}`} icon={ClipboardList} tone="mint" />
          <StatTile label="Hours logged" value={`${onDate.reduce((a, l) => a + totalHours(l), 0)}h`} />
          <StatTile label="Blockers raised" value={String(blockers)} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {shown.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No logs" description={person === "all" ? "Nobody has logged work for this day yet." : "This person hasn't logged any work yet."} />
          ) : (
            shown.map((l) => <LogCard key={l.id} log={l} author={userById(users, l.userId)} tasks={tasks} showDate={person !== "all"} />)
          )}
        </div>
        {person === "all" && (
          <Card className="self-start">
            <CardHeader title="Not submitted" description={`${missing.length} for ${date === today ? "today" : formatDate(date, { year: undefined })}`} />
            {missing.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted"><CircleCheck className="size-4 text-primary-ink" /> Everyone has logged.</p>
            ) : (
              <ul className="space-y-2">
                {missing.map((u) => (
                  <li key={u.id}>
                    <button type="button" onClick={() => setPerson(u.id)} className="flex w-full items-center gap-3 rounded-2xl bg-canvas p-3 text-left hover:bg-mint-soft">
                      <Avatar name={u.name} size="sm" />
                      <span className="min-w-0 text-sm">
                        <span className="block truncate font-bold">{u.name}</span>
                        <span className="block truncate text-xs text-muted">{u.position}</span>
                      </span>
                      <UserX className="ml-auto size-4 text-muted" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
