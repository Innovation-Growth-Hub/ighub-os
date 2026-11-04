import type { ReactNode } from "react";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  Hourglass,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "good" | "warning" | "critical" | "info" | "mint";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink",
  good: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-900",
  critical: "bg-red-100 text-red-800",
  info: "bg-sky-100 text-sky-900",
  mint: "bg-mint text-ink",
};

export function Badge({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />}
      {children}
    </span>
  );
}

/** Status colours always ship with an icon + label, never colour alone. */
const STATUS: Record<string, { tone: Tone; icon: LucideIcon; label: string }> = {
  on_time: { tone: "good", icon: CircleCheck, label: "On time" },
  late: { tone: "warning", icon: Clock, label: "Late" },
  absent: { tone: "critical", icon: CircleX, label: "Absent" },
  pending: { tone: "warning", icon: Hourglass, label: "Pending" },
  approved: { tone: "good", icon: CircleCheck, label: "Approved" },
  rejected: { tone: "critical", icon: CircleX, label: "Rejected" },
  in_progress: { tone: "info", icon: Hourglass, label: "In progress" },
  complete: { tone: "good", icon: CircleCheck, label: "Complete" },
  planning: { tone: "neutral", icon: Hourglass, label: "Planning" },
  active: { tone: "info", icon: CircleCheck, label: "Active" },
  on_hold: { tone: "warning", icon: CircleAlert, label: "On hold" },
  completed: { tone: "good", icon: CircleCheck, label: "Completed" },
  scheduled: { tone: "info", icon: Clock, label: "Scheduled" },
  cancelled: { tone: "critical", icon: CircleX, label: "Cancelled" },
  draft: { tone: "neutral", icon: Hourglass, label: "Draft" },
  sent: { tone: "info", icon: Clock, label: "Sent" },
  paid: { tone: "good", icon: CircleCheck, label: "Paid" },
  overdue: { tone: "critical", icon: CircleAlert, label: "Overdue" },
  inactive: { tone: "neutral", icon: CircleX, label: "Inactive" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { tone: "neutral" as Tone, icon: CircleAlert, label: status };
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {s.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: "low" | "medium" | "high" }) {
  const tone: Tone = priority === "high" ? "critical" : priority === "medium" ? "warning" : "neutral";
  return <Badge tone={tone}>{priority[0].toUpperCase() + priority.slice(1)}</Badge>;
}

/** Micro-tag (rounded-xl per spec). */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-xl bg-canvas px-2 py-0.5 text-[11px] font-semibold text-muted">
      {children}
    </span>
  );
}
