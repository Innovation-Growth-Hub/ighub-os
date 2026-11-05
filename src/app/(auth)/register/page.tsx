"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CircleAlert } from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";
import { AuthFrame } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    const { error } = await authClient.signUp.email({
      name: String(f.get("name")),
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.replace("/dashboard");
  }

  return (
    <AuthFrame message="Join the hub!">
      <h1 className="text-3xl font-extrabold tracking-tight">Create your account</h1>
      <p className="mt-1 text-muted">New accounts join as students. An admin can change your role.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Full name" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" hint="Mock mode: use “password” so you can log back in.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            <CircleAlert className="size-4" aria-hidden /> {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full justify-center" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-primary-ink hover:underline">
          Log in
        </Link>
      </p>
    </AuthFrame>
  );
}
