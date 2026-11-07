"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";
import { canAccess, isComingSoon } from "@ighub/shared";
import { EmptyState } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { BrandLoader } from "@/components/ui/brand-loader";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * Authenticated shell. Renders nothing route-specific until mounted, because
 * the mock session + data live in localStorage (client-only). This also keeps
 * time-dependent UI out of the prerendered shell.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client hydration flag
  useEffect(() => setMounted(true), []);

  const user = session?.user;
  // Deactivated (or not-yet-launched role) mid-session: end the session.
  const blocked = Boolean(user && (!user.isActive || isComingSoon(user.role)));
  const mustChange = Boolean(user?.mustChangePassword);

  useEffect(() => {
    if (!mounted) return;
    if (!session || blocked) {
      // Clear a stale cookie so the proxy doesn't bounce us back here.
      authClient.signOut().then(() => router.replace(`/login?next=${encodeURIComponent(pathname)}`));
    } else if (mustChange) {
      router.replace(`/change-password?next=${encodeURIComponent(pathname)}`);
    }
  }, [mounted, session, blocked, mustChange, router, pathname]);

  if (!mounted || !session || blocked || mustChange) return <ShellLoading />;

  const allowed = canAccess(session.user.role, pathname);

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.user.role} open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={session.user} onMenu={() => setNavOpen(true)} />
        <main className="flex-1 p-4 sm:p-8">
          {allowed ? (
            children
          ) : (
            <EmptyState
              icon={Lock}
              title="You don't have access to this page"
              description="Ask an admin if you think you should."
              action={<LinkButton href="/dashboard">Back to dashboard</LinkButton>}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export function ShellLoading() {
  return <BrandLoader fullScreen />;
}
