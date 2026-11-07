"use client";

import { useState, type FormEvent } from "react";
import { Check, Clock, MapPin, Plus, X } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { canScheduleMeetings, isAdmin } from "@ighub/shared";
import { workers } from "@ighub/shared";
import type { MeetingStatus } from "@ighub/shared";
import { cn, formatTime, toDateKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Avatar, PageHeader, Pills } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { MiniCalendar } from "@/components/dashboard/shared";
import { useActions, useMeetings, useUsers } from "@/lib/api/hooks";
import { userById } from "@/lib/derived";

export default function MeetingsPage() {
  const user = useCurrentUser();
  const meetings = useMeetings();
  const users = useUsers();
  const { addMeeting, setMeetingStatus } = useActions();
  const [filter, setFilter] = useState<"all" | MeetingStatus>("scheduled");
  const [creating, setCreating] = useState(false);
  const [participants, setParticipants] = useState<string[]>([user.id]);
  const [today] = useState(() => toDateKey(new Date()));

  const canSchedule = canScheduleMeetings(user.role);
  const mine = isAdmin(user.role) ? meetings : meetings.filter((m) => m.participantIds.includes(user.id));
  const shown = mine.filter((m) => filter === "all" || m.status === filter).sort((a, b) => (filter === "scheduled" ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start)));

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const date = String(f.get("date"));
    addMeeting({
      title: String(f.get("title")),
      description: String(f.get("description")),
      start: `${date}T${f.get("start")}:00`,
      end: `${date}T${f.get("end")}:00`,
      location: String(f.get("location")),
      participantIds: participants,
      agenda: String(f.get("agenda")).split("\n").map((s) => s.trim()).filter(Boolean),
    });
    setCreating(false);
    setParticipants([user.id]);
  }

  return (
    <>
      <PageHeader
        title="Meetings"
        description={canSchedule ? "Schedule, agendas and attendees" : "Meetings you've been invited to"}
        actions={canSchedule && <Button onClick={() => setCreating(true)}><Plus className="size-4" /> Schedule meeting</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Pills
            label="Filter meetings"
            value={filter}
            onChange={setFilter}
            options={[{ value: "scheduled", label: "Upcoming" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }, { value: "all", label: "All" }]}
          />
          {shown.length === 0 && <p className="rounded-3xl bg-surface p-6 text-sm text-muted">No meetings here.</p>}
          {shown.map((m) => {
            const start = new Date(m.start);
            // The organiser is the first participant.
            const canManage = isAdmin(user.role) || (canSchedule && m.participantIds[0] === user.id);
            return (
              <Card key={m.id} className="flex flex-col gap-5 sm:flex-row">
                <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-mint py-3">
                  <span className="text-xs font-bold text-muted uppercase">{start.toLocaleDateString("en-NG", { month: "short" })}</span>
                  <span className="text-3xl leading-none font-extrabold">{start.getDate()}</span>
                  <span className="text-xs font-semibold text-muted">{start.toLocaleDateString("en-NG", { weekday: "short" })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold">{m.title}</h2>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">{m.description}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
                    <span className="flex items-center gap-1"><Clock className="size-4 text-muted" />{formatTime(m.start)} – {formatTime(m.end)}</span>
                    <span className="flex items-center gap-1"><MapPin className="size-4 text-muted" />{m.location}</span>
                  </p>
                  {m.agenda.length > 0 && (
                    <ol className="mt-3 flex flex-wrap gap-1.5">
                      {m.agenda.map((a, i) => <li key={i} className="rounded-xl bg-canvas px-2.5 py-1 text-xs font-semibold">{i + 1}. {a}</li>)}
                    </ol>
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex -space-x-2">
                      {m.participantIds.map((id) => {
                        const u = userById(users, id);
                        return u ? <span key={id} title={u.name}><Avatar name={u.name} size="sm" /></span> : null;
                      })}
                    </div>
                    {m.status === "scheduled" && canManage && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="danger" onClick={() => setMeetingStatus(m.id, "cancelled")}><X className="size-4" /> Cancel</Button>
                        <Button size="sm" variant="mint" onClick={() => setMeetingStatus(m.id, "completed")}><Check className="size-4" /> Mark done</Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <div>
          <MiniCalendar meetings={mine} />
        </div>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Schedule meeting">
        <form onSubmit={onCreate} className="space-y-4">
          <Field label="Title" htmlFor="title"><Input id="title" name="title" required /></Field>
          <Field label="Description" htmlFor="description"><Input id="description" name="description" /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" htmlFor="date"><Input id="date" name="date" type="date" required defaultValue={today} min={today} /></Field>
            <Field label="Start" htmlFor="start"><Input id="start" name="start" type="time" required defaultValue="10:00" /></Field>
            <Field label="End" htmlFor="end"><Input id="end" name="end" type="time" required defaultValue="11:00" /></Field>
          </div>
          <Field label="Location" htmlFor="location"><Input id="location" name="location" required placeholder="Umuahia HQ: Boardroom or Google Meet" /></Field>
          <Field label="Agenda" htmlFor="agenda" hint="One item per line"><Textarea id="agenda" name="agenda" /></Field>
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Participants</legend>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {workers(users).map((u) => {
                const on = participants.includes(u.id);
                return (
                  <button key={u.id} type="button" aria-pressed={on} onClick={() => setParticipants((p) => (on ? p.filter((x) => x !== u.id) : [...p, u.id]))} className={cn("rounded-full px-3 py-1.5 text-xs font-bold", on ? "bg-mint" : "bg-surface-2 text-muted")}>
                    {u.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <Button type="submit" className="w-full justify-center">Schedule</Button>
        </form>
      </Modal>
    </>
  );
}
