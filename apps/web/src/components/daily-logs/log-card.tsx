import { AlertTriangle, Link2 } from "lucide-react";
import type { DailyLog, Task, User } from "@ighub/shared";
import { formatDate, formatTime } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";

export function totalHours(log: DailyLog) {
  return log.entries.reduce((a, e) => a + (e.hours ?? 0), 0);
}

/** Read-only daily log. Used for history and for the super admin's view. */
export function LogCard({ log, author, tasks, showDate = false }: { log: DailyLog; author?: User; tasks: Task[]; showDate?: boolean }) {
  const hours = totalHours(log);
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {author && <Avatar name={author.name} size="sm" />}
          <div>
            <p className="font-extrabold">{author ? author.name : formatDate(log.date, { weekday: "long" })}</p>
            <p className="text-xs text-muted">
              {author && `${author.position} · `}
              {showDate && author && `${formatDate(log.date, { weekday: "short" })} · `}
              updated {formatTime(log.updatedAt)}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold">
          {log.entries.length} item{log.entries.length === 1 ? "" : "s"}
          {hours > 0 && ` · ${hours}h`}
        </span>
      </div>
      <ul className="space-y-2">
        {log.entries.map((e) => {
          const task = tasks.find((t) => t.id === e.taskId);
          return (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded-2xl bg-canvas px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold">{e.description}</p>
                {task && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <Link2 className="size-3.5" aria-hidden /> {task.title}
                  </p>
                )}
              </div>
              {e.hours !== undefined && <span className="shrink-0 text-xs font-bold text-muted">{e.hours}h</span>}
            </li>
          );
        })}
      </ul>
      {log.blockers && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span><span className="font-bold">Blocker:</span> {log.blockers}</span>
        </p>
      )}
    </Card>
  );
}
