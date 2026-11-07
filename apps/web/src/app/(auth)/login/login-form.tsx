"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CircleAlert } from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

/** Only follow same-site relative paths. */
function safeNext(next: string | null) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    const { data, error } = await authClient.signIn.email({
      email: String(f.get("email")).trim(),
      password: String(f.get("password")),
    });
    setLoading(false);
    if (error) {
      setError(error.status === 401 ? "Invalid email or password." : error.message ?? "Couldn't log in. Try again.");
      return;
    }
    const mustChange = (data?.user as { mustChangePassword?: boolean } | undefined)?.mustChangePassword;
    router.replace(mustChange ? `/change-password?next=${encodeURIComponent(safeNext(next))}` : safeNext(next));
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
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
        Accounts are created by the IGHub Management.
        <br />
        Forgot your password? Reach out to them to reset it.
      </p>
    </>
  );
}
