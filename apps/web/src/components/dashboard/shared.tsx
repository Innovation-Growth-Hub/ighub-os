"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useDb, userById } from "@/lib/store";
import type { Meeting } from "@ighub/shared";
import { cn, formatTime, toDateKey } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";

/** Month calendar with dots on days that have meetings. */
export function MiniCalendar({ meetings }: { meetings: Meeting[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selected, setSelected] = useState(() => toDateKey(new Date()));
  const today = toDateKey(new Date());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const meetingDays = new Set(meetings.filter((m) => m.status !== "cancelled").map((m) => m.start.slice(0, 10)));
  const dayMeetings = meetings.filter((m) => m.start.startsWith(selected)).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-extrabold">{cursor.toLocaleDateString("en-NG", { month: "long", year: "numeric" })}</h2>
        <div className="flex gap-1">
          <button type="button" aria-label="Previous month" onClick={() => setCursor(new Date(year, month - 1, 1))} className="flex size-8 items-center justify-center rounded-full bg-canvas hover:bg-surface-3">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" aria-label="Next month" onClick={() => setCursor(new Date(year, month + 1, 1))} className="flex size-8 items-center justify-center rounded-full bg-canvas hover:bg-surface-3">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-muted">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="py-1">{d}</span>
        ))}
        {Array.from({ length: offset }).map((_, i) => (
          <span key={`o${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const key = toDateKey(new Date(year, month, i + 1));
          const isSel = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              aria-pressed={isSel}
              aria-label={`${key}${meetingDays.has(key) ? ", has meetings" : ""}`}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-full text-xs font-bold transition-colors",
                isSel ? "bg-primary text-on-primary" : key === today ? "bg-mint text-ink" : "text-ink hover:bg-canvas",
              )}
            >
              {i + 1}
              {meetingDays.has(key) && !isSel && <span className="absolute bottom-1 size-1 rounded-full bg-primary-ink" />}
            </button>
          );
        })}
      </div>
      <div className="mt-5 space-y-2">
        <p className="text-xs font-bold text-muted">
          {new Date(`${selected}T00:00:00`).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "short" })}
        </p>
        {dayMeetings.length === 0 ? (
          <p className="text-sm text-muted">Nothing scheduled.</p>
        ) : (
          dayMeetings.map((m) => (
            <Link key={m.id} href="/meetings" className="block rounded-2xl bg-canvas p-3 hover:bg-mint-soft">
              <p className="text-sm font-bold">{m.title}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                {formatTime(m.start)}–{formatTime(m.end)} · <MapPin className="size-3" /> {m.location}
              </p>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}

export function UpcomingSchedule({ meetings, limit = 4 }: { meetings: Meeting[]; limit?: number }) {
  const [now] = useState(() => new Date().toISOString());
  const upcoming = meetings
    .filter((m) => m.status === "scheduled" && m.end >= now.slice(0, 19))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, limit);
  return (
    <Card>
      <CardHeader title="Schedule" description="Upcoming meetings" action={<Link href="/meetings" className="text-sm font-bold text-primary-ink hover:underline">View all</Link>} />
      {upcoming.length === 0 ? (
        <p className="text-sm text-muted">No upcoming meetings.</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((m) => (
            <li key={m.id} className="flex gap-4 rounded-2xl bg-canvas p-3">
              <div className="w-12 shrink-0 rounded-xl bg-mint py-1.5 text-center">
                <p className="text-[10px] font-bold text-muted uppercase">{new Date(m.start).toLocaleDateString("en-NG", { month: "short" })}</p>
                <p className="text-lg leading-none font-extrabold">{new Date(m.start).getDate()}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{m.title}</p>
                <p className="truncate text-xs text-muted">
                  {formatTime(m.start)} · {m.location}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function RecentActivity({ limit = 6 }: { limit?: number }) {
  const activities = useDb((s) => s.activities);
  const users = useDb((s) => s.users);
  const items = [...activities].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  return (
    <Card>
      <CardHeader title="Recent activity" />
      <ol className="space-y-4">
        {items.map((a) => {
          const u = userById(users, a.actorId);
          return (
            <li key={a.id} className="flex gap-3">
              <Avatar name={u?.name ?? "?"} size="sm" />
              <div className="min-w-0 text-sm">
                <p>
                  <span className="font-bold">{u?.name ?? "Someone"}</span> {a.message}
                </p>
                <p className="text-xs text-muted">
                  {new Date(a.at).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
