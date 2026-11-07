"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";
import { canAccess } from "@ighub/shared";
import type { Role } from "@ighub/shared";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "./nav";
import Image from "next/image";

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <Image src="/img-assets/ig-Logo.png" 
       alt="Picture of the author"
       width={100}
      height={50}
      />
    </Link>
  );
}

export function Sidebar({ role, open, onClose }: { role: Role; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => canAccess(role, i.href)),
  })).filter((s) => s.items.length);

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  return (
    <>
      {/* mobile scrim */}
      <div
        className={cn("fixed inset-0 z-30 bg-ink/40 lg:hidden", open ? "block" : "hidden")}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-surface transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-20 shrink-0 items-center justify-between px-6">
          <Logo />
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-full bg-canvas lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-4 pb-4" aria-label="Main">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-1.5 text-[11px] font-bold tracking-wider text-muted uppercase">{section.title}</p>
              <ul className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-10 items-center gap-3 rounded-full px-4 text-sm font-bold transition-colors",
                          active ? "bg-mint text-ink" : "text-muted hover:bg-canvas hover:text-ink",
                        )}
                      >
                        <Icon className={cn("size-4.5", active && "text-primary-ink")} strokeWidth={2} aria-hidden />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4">
          <button
            type="button"
            onClick={signOut}
            className="flex h-11 w-full items-center gap-3 rounded-full px-4 text-sm font-bold text-red-700 hover:bg-red-50"
          >
            <LogOut className="size-4.5" aria-hidden />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
