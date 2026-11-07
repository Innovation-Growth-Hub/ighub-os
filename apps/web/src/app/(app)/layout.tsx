import { Suspense } from "react";
import { AppShell, ShellLoading } from "@/components/layout/app-shell";

export default function AppLayout({ children }: LayoutProps<"/">) {
  // The shell reads the URL (usePathname) and the client-side mock session,
  // so it streams in behind Suspense rather than blocking the static shell.
  return (
    <Suspense fallback={<ShellLoading />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
