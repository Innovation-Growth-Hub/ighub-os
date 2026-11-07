"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { authClient, toUser } from "@/lib/auth/auth-client";
import { Toaster } from "@/lib/api/toast";
import { canAccess, isComingSoon } from "@ighub/shared";
import { EmptyState } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { BrandLoader } from "@/components/ui/brand-loader";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * Authenticated shell. Waits for the Better Auth session (from the API), then:
 * no session / deactivated / coming-soon role → /login;
 * temporary password → /change-password; otherwise renders the page.
 * The API enforces all of this again on every request.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();

  const user = session ? toUser(session.user) : null;
  const blocked = Boolean(user && (!user.isActive || isComingSoon(user.role)));
  const mustChange = Boolean(user?.mustChangePassword);

  useEffect(() => {
    if (isPending) return;
    if (!user || blocked) {
      authClient.signOut().finally(() => router.replace(`/login?next=${encodeURIComponent(pathname)}`));
    } else if (mustChange) {
      router.replace(`/change-password?next=${encodeURIComponent(pathname)}`);
    }
  }, [isPending, user, blocked, mustChange, router, pathname]);

  if (isPending || !user || blocked || mustChange) return <ShellLoading />;

  const allowed = canAccess(user.role, pathname);

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} onMenu={() => setNavOpen(true)} />
        <main className="flex-1 p-4 sm:p-8">
          {allowed ? (
            children
          ) : (
            <EmptyState
              icon={Lock}
              title="You don't have access to this page"
              description="Ask the super admin if you think you should."
              action={<LinkButton href="/dashboard">Back to dashboard</LinkButton>}
            />
          )}
        </main>
      </div>
      <Toaster />
    </div>
  );
}

export function ShellLoading() {
  return <BrandLoader fullScreen />;
}
