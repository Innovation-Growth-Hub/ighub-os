"use client";

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

/** Demo shortcuts for the roles that are live today. */
const DEMO_ACCOUNTS: Array<{ role: Role; email: string }> = [
  { role: "super_admin", email: "superadmin@ighub.com" },
  { role: "admin", email: "admin@ighub.com" },
  { role: "staff", email: "staff@ighub.com" },
  { role: "project_manager", email: "pm@ighub.com" },
  { role: "accountant", email: "accounts@ighub.com" },
];

/** Only follow same-site relative paths. */
function safeNext(next: string | null) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

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
    const { data, error } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    if (data.user.mustChangePassword) {
      router.replace(`/change-password?next=${encodeURIComponent(safeNext(next))}`);
      return;
    }
    router.replace(safeNext(next));
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
            <CircleAlert className="size-4 shrink-0" aria-hidden /> {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full justify-center" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Accounts are created by the IGHub super admin.
        <br />
        Forgot your password? Ask them to reset it.
      </p>

      <details className="group mt-8 rounded-3xl bg-surface px-5 py-4">
        <summary className="cursor-pointer list-none text-sm font-bold text-muted marker:hidden hover:text-ink">
          Try a demo account <span className="inline-block transition-transform group-open:rotate-90">›</span>
        </summary>
        <p className="mt-2 text-xs text-muted">
          Mock data only. Pick a role to fill the form (password: <code className="font-bold">{DEMO_PASSWORD}</code>).
          Social media manager, trainer, student and client accounts are coming soon.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
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
      </details>
    </>
  );
}
