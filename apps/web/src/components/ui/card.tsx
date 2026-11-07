import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Flat surface card. Separation comes from the warm-gray fill, never borders/shadows. */
export function Card({
  className,
  tone = "surface",
  ...props
}: ComponentProps<"div"> & { tone?: "surface" | "canvas" | "mint" }) {
  return (
    <div
      className={cn(
        "rounded-3xl p-6",
        tone === "surface" && "bg-surface",
        tone === "canvas" && "bg-canvas",
        tone === "mint" && "bg-mint-soft",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-extrabold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
