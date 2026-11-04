"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { isAdmin } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

/** Sub-navigation shared by every /attendance page. */
export function AttendanceTabs() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const tabs = [
    { href: "/attendance", label: isAdmin(user.role) ? "Overview" : "My attendance" },
    { href: "/attendance/clock", label: "Clock in / out" },
    { href: "/attendance/late-requests", label: "Late requests" },
    ...(isAdmin(user.role) ? [{ href: "/attendance/qr", label: "Office QR codes" }] : []),
  ];
  return (
    <nav aria-label="Attendance" className="mb-6 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={pathname === t.href ? "page" : undefined}
          className={cn(
            "inline-flex h-9 items-center rounded-full px-4 text-sm font-bold transition-colors",
            pathname === t.href ? "bg-mint text-ink" : "bg-surface-2 text-muted hover:text-ink",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
