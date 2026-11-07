"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function CrmTabs() {
  const pathname = usePathname();
  const tabs = [
    { href: "/crm", label: "Contacts" },
    { href: "/crm/pipeline", label: "Pipeline" },
  ];
  return (
    <nav aria-label="CRM" className="mb-6 flex gap-2">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={pathname === t.href ? "page" : undefined}
          className={cn("inline-flex h-9 items-center rounded-full px-4 text-sm font-bold", pathname === t.href ? "bg-mint" : "bg-surface-2 text-muted hover:text-ink")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
