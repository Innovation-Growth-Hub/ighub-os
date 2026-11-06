"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { CircleCheck, RotateCcw } from "lucide-react";
import { authClient, useCurrentUser } from "@/lib/auth/auth-client";
import { isSuperAdmin, ROLE_LABELS } from "@/lib/auth/roles";
import { MIN_PASSWORD_LENGTH } from "@/lib/mock/seed";
import { useDb } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Avatar, PageHeader, Pills } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { BrandLoader } from "@/components/ui/brand-loader";

type Tab = "profile" | "account";

export default function SettingsPage() {
  return (
    <Suspense fallback={<BrandLoader />}>
      <Settings />
    </Suspense>
  );
}

function Settings() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("tab") === "account" ? "account" : "profile");
  return (
    <>
      <PageHeader title="Settings" />
      <div className="mb-6">
        <Pills label="Settings section" value={tab} onChange={setTab} options={[{ value: "profile", label: "Edit profile" }, { value: "account", label: "Account" }]} />
      </div>
      {tab === "profile" ? <Profile /> : <Account />}
    </>
  );
}

function Saved({ show }: { show: boolean }) {
  return show ? <span className="flex items-center gap-1 text-sm font-bold text-primary-ink"><CircleCheck className="size-4" /> Saved</span> : null;
}

function Profile() {
  const user = useCurrentUser();
  const updateUser = useDb((s) => s.updateUser);
  const [saved, setSaved] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    updateUser(user.id, { name: String(f.get("name")), phone: String(f.get("phone")) || undefined });
    setSaved(true);
  }

  return (
    <Card className="max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={user.name} size="lg" />
        <div>
          <p className="text-lg font-extrabold">{user.name}</p>
          <div className="mt-1 flex gap-2"><Badge tone="mint">{ROLE_LABELS[user.role]}</Badge><Badge>{user.position}</Badge></div>
        </div>
      </div>
      <form onSubmit={onSubmit} onChange={() => setSaved(false)} className="space-y-4">
        <Field label="Full name" htmlFor="name"><Input id="name" name="name" required defaultValue={user.name} className="bg-canvas" /></Field>
        <Field label="Email" htmlFor="email" hint="Ask the super admin to change your email."><Input id="email" value={user.email} disabled className="bg-canvas opacity-70" /></Field>
        <Field label="Phone" htmlFor="phone"><Input id="phone" name="phone" type="tel" defaultValue={user.phone} className="bg-canvas" /></Field>
        <div className="flex items-center gap-4"><Button type="submit">Save profile</Button><Saved show={saved} /></div>
      </form>
    </Card>
  );
}

function Account() {
  const user = useCurrentUser();
  const router = useRouter();
  const resetDemo = useDb((s) => s.resetDemo);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChangePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setSaved(false);
    if (f.get("new") !== f.get("confirm")) return setError("The new passwords don't match.");
    const { error } = await authClient.changePassword({
      currentPassword: String(f.get("current")),
      newPassword: String(f.get("new")),
      revokeOtherSessions: true,
    });
    if (error) return setError(error.message);
    setError(null);
    setSaved(true);
    form.reset();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader title="Password" description="Forgot it? Ask the super admin to reset it." />
        <form onSubmit={onChangePassword} className="space-y-4">
          <Field label="Current password" htmlFor="current"><Input id="current" name="current" type="password" autoComplete="current-password" required className="bg-canvas" /></Field>
          <Field label="New password" htmlFor="new" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}><Input id="new" name="new" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required className="bg-canvas" /></Field>
          <Field label="Confirm new password" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required className="bg-canvas" /></Field>
          {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}
          <div className="flex items-center gap-4"><Button type="submit">Update password</Button><Saved show={saved} /></div>
        </form>
      </Card>
      {isSuperAdmin(user.role) && (
        <Card>
          <CardHeader title="Demo data" description="Restore every module to the original mock dataset. Changes made in this browser are lost." />
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm("Reset all demo data?")) return;
              resetDemo();
              await authClient.signOut();
              router.replace("/login");
            }}
          >
            <RotateCcw className="size-4" /> Reset demo data
          </Button>
        </Card>
      )}
    </div>
  );
}
