import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Borderless data table: rows separate by hover fill and spacing, the header
 * by a rounded surface band (no hairlines, per the design constraints).
 */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className={cn("w-full border-separate border-spacing-y-1 text-left text-sm", className)} {...props} />
    </div>
  );
}

export function THead(props: ComponentProps<"thead">) {
  return <thead {...props} />;
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "bg-canvas px-4 py-3 text-xs font-bold tracking-wide whitespace-nowrap text-muted uppercase first:rounded-l-2xl last:rounded-r-2xl",
        className,
      )}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("group", className)} {...props} />;
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle transition-colors first:rounded-l-2xl last:rounded-r-2xl group-hover:bg-canvas",
        className,
      )}
      {...props}
    />
  );
}
