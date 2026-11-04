import type { Metadata } from "next";
import { Suspense } from "react";
import { LogoLoader } from "@/components/ui/logo-loader";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-muted">Log in to IGHUB OS.</p>
      {/* useSearchParams is URL data, so it streams behind Suspense. */}
      <Suspense fallback={<LogoLoader label="Loading sign-in…" className="min-h-80" />}>
        <LoginForm />
      </Suspense>
    </>
  );
}
