"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { MIN_PASSWORD_LENGTH } from "@ighub/shared";
import { CircleAlert } from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { BrandLoader } from "@/components/ui/brand-loader";

/**
 * First login: the super admin set a temporary password, so the user must
 * replace it before reaching their dashboard. The app shell sends them here
 * until they do.
 */
export function ChangePasswordForm() {
  const router = useRouter();
  const rawNext = useSearchParams().get("next");
  const next = rawNext?.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const { data: session, isPending, refetch } = authClient.useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) authClient.signOut().finally(() => router.replace("/login"));
    else if (!session.user.mustChangePassword) router.replace(next);
  }, [isPending, session, router, next]);

  if (isPending || !session?.user.mustChangePassword) return <BrandLoader className="min-h-64" />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newPassword = String(f.get("new"));
    if (newPassword !== String(f.get("confirm"))) return setError("The new passwords don't match.");
    setLoading(true);
    setError(null);
    const { error } = await authClient.changePassword({
      currentPassword: String(f.get("current")),
      newPassword,
      revokeOtherSessions: true,
    });
    setLoading(false);
    if (error) return setError(error.status === 400 || error.status === 401 ? "Your temporary password is incorrect." : error.message ?? "Couldn't save. Try again.");
    // The API cleared the "must change" flag; reload the session before leaving.
    await refetch();
    router.replace(next);
  }

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Set your password</h1>
      <p className="mt-1 text-muted">
        Welcome, {session.user.name.split(" ")[0]}. Replace the temporary password you were given with one only you know.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Temporary password" htmlFor="current">
          <Input id="current" name="current" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="New password" htmlFor="new" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
          <Input id="new" name="new" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
        </Field>
        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            <CircleAlert className="size-4 shrink-0" aria-hidden /> {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full justify-center" disabled={loading}>
          {loading ? "Saving…" : "Save and continue"}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => authClient.signOut().then(() => router.replace("/login"))}
        className="mt-6 w-full text-center text-sm font-bold text-muted hover:text-ink"
      >
        Log out
      </button>
    </>
  );
}
