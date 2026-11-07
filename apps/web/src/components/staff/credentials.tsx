"use client";

import { useState } from "react";
import { Copy, KeyRound } from "lucide-react";
import { ROLE_LABELS } from "@ighub/shared";
import type { User } from "@ighub/shared";
import { Button } from "@/components/ui/button";

/** Shown once after creating an account or resetting a password. */
export function Credentials({
  user,
  password,
  onDone,
  reset = false,
}: {
  user: User;
  password: string;
  onDone: () => void;
  reset?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const text = `${reset ? "Your IGHubOs password was reset." : "Your IGHubOs account is ready."}
Log in: ${typeof window === "undefined" ? "" : window.location.origin}/login
Email: ${user.email}
Temporary password: ${password}
You will be asked to set your own password when you first log in.`;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Send these details to {user.name} privately (WhatsApp or in person). This is the only time the password is shown.
      </p>
      <dl className="space-y-2 rounded-3xl bg-surface p-5 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-muted">Email</dt><dd className="font-bold">{user.email}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted">Role</dt><dd className="font-bold">{ROLE_LABELS[user.role]}</dd></div>
        <div className="flex justify-between gap-4">
          <dt className="flex items-center gap-1.5 text-muted"><KeyRound className="size-4" aria-hidden />Temporary password</dt>
          <dd className="font-mono font-bold">{password}</dd>
        </div>
      </dl>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1 justify-center"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          }}
        >
          <Copy className="size-4" /> {copied ? "Copied" : "Copy login details"}
        </Button>
        <Button className="flex-1 justify-center" onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}
