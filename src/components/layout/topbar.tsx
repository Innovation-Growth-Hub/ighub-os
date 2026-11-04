"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { useDb } from "@/lib/store";
import type { User } from "@/lib/types";
import { greeting } from "@/lib/utils";
import { Avatar } from "@/components/ui/misc";

export function Topbar({ user, onMenu }: { user: User; onMenu: () => void }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const menuRef = useRef<HTMLDivElement>(null);
  const pending = useDb((s) => s.lateRequests.filter((r) => r.status === "pending").length);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center gap-3 bg-canvas/90 px-4 backdrop-blur sm:px-8">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="flex size-10 items-center justify-center rounded-full bg-surface lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-extrabold tracking-tight">
          {greeting(now.getHours())}, {user.name.split(" ")[0]} 👋
        </p>
        <p className="hidden text-xs text-muted sm:block">
          {now.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {" · "}
          {now.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>

      <label className="relative hidden md:block">
        <span className="sr-only">Search</span>
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder="Search IGHUB OS…"
          className="h-11 w-64 rounded-full bg-surface pr-4 pl-11 text-sm outline-none placeholder:text-muted focus:bg-surface-2"
        />
      </label>

      <Link
        href="/attendance"
        aria-label={`Notifications${pending ? `, ${pending} pending` : ""}`}
        className="relative flex size-11 items-center justify-center rounded-full bg-surface hover:bg-surface-2"
      >
        <Bell className="size-5" />
        {pending > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-on-primary">
            {pending}
          </span>
        )}
      </Link>

      <Link
        href="/settings"
        aria-label="Settings"
        className="hidden size-11 items-center justify-center rounded-full bg-surface hover:bg-surface-2 sm:flex"
      >
        <Settings className="size-5" />
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex items-center gap-2 rounded-full bg-surface py-1 pr-3 pl-1 hover:bg-surface-2"
        >
          <Avatar name={user.name} size="sm" />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-sm font-bold">{user.name}</span>
            <span className="block text-[11px] text-muted">{ROLE_LABELS[user.role]}</span>
          </span>
          <ChevronDown className="size-4 text-muted" />
        </button>
        {menuOpen && (
          <div role="menu" className="absolute right-0 mt-2 w-56 rounded-3xl bg-surface p-2">
            <Link role="menuitem" href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-canvas">
              <UserRound className="size-4" /> Edit profile
            </Link>
            <Link role="menuitem" href="/settings?tab=account" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-canvas">
              <Settings className="size-4" /> Account settings
            </Link>
            <button role="menuitem" type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50">
              <LogOut className="size-4" /> Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
