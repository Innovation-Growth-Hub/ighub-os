"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardList, CircleCheck } from "lucide-react";
import { canViewAllDailyLogs, isComingSoon, writesDailyLog } from "@ighub/shared";
import { workers } from "@ighub/shared";
import type { User } from "@ighub/shared";
import { toDateKey } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { useDailyLogs, useUsers } from "@/lib/api/hooks";

/** Super admin: who has logged today. Everyone else: a nudge to log today's work. */
export function DailyLogCard({ user }: { user: User }) {
  const dailyLogs = useDailyLogs();
  const users = useUsers();
  const [today] = useState(() => toDateKey(new Date()));
  const todays = dailyLogs.filter((l) => l.date === today);

  if (canViewAllDailyLogs(user.role)) {
    const team = workers(users).filter((u) => writesDailyLog(u.role) && !isComingSoon(u.role));
    const done = team.filter((u) => todays.some((l) => l.userId === u.id)).length;
    return (
      <Card>
        <CardHeader
          title="Daily logs today"
          action={<Link href="/daily-logs" className="text-sm font-bold text-primary-ink hover:underline">Read logs</Link>}
        />
        <p className="text-4xl font-extrabold">
          {done}
          <span className="text-lg text-muted"> / {team.length}</span>
        </p>
        <Progress value={team.length ? (done / team.length) * 100 : 0} className="mt-4" label="Team members who logged today" />
        <p className="mt-3 text-sm text-muted">Team members who have logged their work today.</p>
      </Card>
    );
  }

  const mine = todays.find((l) => l.userId === user.id);
  return (
    <Card tone={mine ? "surface" : "mint"}>
      <CardHeader title="Today's log" />
      {mine ? (
        <p className="flex items-center gap-2 text-sm">
          <CircleCheck className="size-4 text-primary-ink" aria-hidden />
          Logged {mine.entries.length} item{mine.entries.length === 1 ? "" : "s"} today.
        </p>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted">
          <ClipboardList className="size-4" aria-hidden /> You haven&apos;t logged today&apos;s work yet.
        </p>
      )}
      <LinkButton href="/daily-logs" variant={mine ? "secondary" : "primary"} size="sm" className="mt-4">
        {mine ? "Edit today's log" : "Log today's work"}
      </LinkButton>
    </Card>
  );
}
