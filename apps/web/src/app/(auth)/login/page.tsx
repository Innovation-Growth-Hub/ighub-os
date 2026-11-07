import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { BrandLoader } from "@/components/ui/brand-loader";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthFrame message="Welcome!">
      <h1 className="text-3xl font-extrabold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-muted">Log in to IGHubOs.</p>
      {/* useSearchParams is URL data, so it streams behind Suspense. */}
      <Suspense fallback={<BrandLoader label="Loading sign-in…" className="min-h-64" />}>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}
