import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <p className="text-7xl font-black text-primary">404</p>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">This page wandered off</h1>
      <p className="mt-1 text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/dashboard" className={buttonClasses("primary", "md", "mt-6")}>Back to dashboard</Link>
    </main>
  );
}
