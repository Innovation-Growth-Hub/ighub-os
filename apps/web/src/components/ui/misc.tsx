import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn, initials } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const avatarTints = ["bg-mint", "bg-sky-100", "bg-amber-100", "bg-rose-100", "bg-violet-100", "bg-surface-3"];

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const tint = avatarTints[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarTints.length];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-ink",
        tint,
        size === "sm" && "size-8 text-[11px]",
        size === "md" && "size-10 text-xs",
        size === "lg" && "size-16 text-lg",
      )}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Stat tile: label · value · optional delta (signed, vs a named period).
 * Delta colour = direction × whether up is good; always paired with an icon.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  upIsGood = true,
  tone = "surface",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  upIsGood?: boolean;
  tone?: "surface" | "mint";
}) {
  const good = delta !== undefined && (delta >= 0) === upIsGood;
  return (
    <div className={cn("rounded-3xl p-6", tone === "mint" ? "bg-mint" : "bg-surface")}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted">{label}</p>
        {Icon && (
          <span className="flex size-9 items-center justify-center rounded-full bg-canvas">
            <Icon className="size-4.5 text-primary-ink" strokeWidth={2} aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight">{value}</p>
      {delta !== undefined && (
        <p className={cn("mt-2 flex items-center gap-1 text-xs font-bold", good ? "text-primary-ink" : "text-red-700")}>
          {delta >= 0 ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
          {delta > 0 ? "+" : ""}
          {delta}%<span className="font-medium text-muted">{deltaLabel ? ` ${deltaLabel}` : ""}</span>
        </p>
      )}
    </div>
  );
}

/** Meter: filled track on a lighter step of the same ramp. */
export function Progress({
  value,
  tone = "primary",
  label,
  className,
}: {
  value: number;
  tone?: "primary" | "warning" | "critical";
  label?: string;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full",
        tone === "primary" && "bg-mint",
        tone === "warning" && "bg-amber-100",
        tone === "critical" && "bg-red-100",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          tone === "primary" && "bg-primary",
          tone === "warning" && "bg-amber-500",
          tone === "critical" && "bg-red-500",
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-surface px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-mint">
        <Icon className="size-6 text-primary-ink" aria-hidden />
      </span>
      <p className="mt-4 font-extrabold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Pill segmented control (the spec's "selection pills"). */
export function Pills<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors",
            value === o.value ? "bg-mint text-ink" : "bg-surface-2 text-muted hover:text-ink",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="text-xs opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
