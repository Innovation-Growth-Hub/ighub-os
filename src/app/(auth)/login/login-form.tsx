"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CircleAlert } from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { DEMO_PASSWORD } from "@/lib/mock/seed";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS: Array<{ role: Role; email: string }> = [
  { role: "super_admin", email: "superadmin@ighub.com" },
  { role: "admin", email: "admin@ighub.com" },
  { role: "staff", email: "staff@ighub.com" },
  { role: "project_manager", email: "pm@ighub.com" },
  { role: "trainer", email: "trainer@ighub.com" },
  { role: "student", email: "student@ighub.com" },
  { role: "social_media_manager", email: "social@ighub.com" },
  { role: "client", email: "client@partner.com" },
];

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    // Only follow same-site relative paths.
    router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            <CircleAlert className="size-4" aria-hidden /> {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full justify-center" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="font-bold text-primary-ink hover:underline">
          Create an account
        </Link>
      </p>

      <div className="mt-10 rounded-3xl bg-surface p-5">
        <p className="text-sm font-extrabold">Demo accounts</p>
        <p className="mt-0.5 text-xs text-muted">
          Mock data only. Pick a role to fill the form (password: <code className="font-bold">{DEMO_PASSWORD}</code>).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email);
                setPassword(DEMO_PASSWORD);
              }}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors",
                email === a.email ? "bg-mint text-ink" : "bg-canvas text-muted hover:text-ink",
              )}
            >
              {ROLE_LABELS[a.role]}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
