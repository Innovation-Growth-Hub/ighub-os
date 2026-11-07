"use client";

import { useState, type FormEvent } from "react";
import { RefreshCw } from "lucide-react";
import { generateTempPassword } from "@ighub/shared";
import { COMING_SOON_ROLES, LIVE_ROLES, ROLE_LABELS } from "@ighub/shared";
import { MIN_PASSWORD_LENGTH, OFFICES } from "@ighub/shared";
import type { OfficeLocation, Role, StaffType, User } from "@ighub/shared";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";

export const STAFF_TYPE_LABELS: Record<StaffType, string> = {
  core_team: "Core Team",
  corper: "Corper (NYSC)",
  intern: "Intern",
};

export type StaffInput = Pick<User, "name" | "email" | "role" | "position" | "phone" | "staffType" | "officeLocation">;

/**
 * Create (with a temporary password) or edit an account. Only the super admin
 * sees this form. Coming-soon roles are listed but can't be picked yet.
 */
export function StaffForm({
  initial,
  onSubmit,
  submitLabel,
  withPassword = false,
  error,
  busy,
}: {
  initial?: Partial<User>;
  onSubmit: (v: StaffInput, password?: string) => void;
  submitLabel: string;
  withPassword?: boolean;
  error?: string | null;
  busy?: boolean;
}) {
  const [password, setPassword] = useState(() => (withPassword ? generateTempPassword() : ""));

  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    onSubmit(
      {
        name: String(f.get("name")),
        email: String(f.get("email")),
        phone: String(f.get("phone")) || undefined,
        position: String(f.get("position")),
        // A disabled (coming-soon) option isn't submitted, so keep the current role.
        role: (f.get("role") as Role | null) ?? (initial?.role as Role),
        staffType: f.get("staffType") as StaffType,
        officeLocation: f.get("officeLocation") as OfficeLocation,
      },
      withPassword ? password : undefined,
    );
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name">
          <Input id="name" name="name" required defaultValue={initial?.name} />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required defaultValue={initial?.email} />
        </Field>
        <Field label="Position" htmlFor="position">
          <Input id="position" name="position" required defaultValue={initial?.position} placeholder="e.g. Frontend Developer" />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" defaultValue={initial?.phone} />
        </Field>
        <Field label="Role" htmlFor="role">
          <Select id="role" name="role" defaultValue={initial?.role ?? "staff"}>
            {LIVE_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
            {COMING_SOON_ROLES.map((r) => (
              <option key={r} value={r} disabled>{ROLE_LABELS[r]} (coming soon)</option>
            ))}
          </Select>
        </Field>
        <Field label="Staff type" htmlFor="staffType">
          <Select id="staffType" name="staffType" defaultValue={initial?.staffType ?? "core_team"}>
            {Object.entries(STAFF_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Office" htmlFor="officeLocation" className="sm:col-span-2">
          <Select id="officeLocation" name="officeLocation" defaultValue={initial?.officeLocation ?? "umuahia_hq"}>
            {Object.entries(OFFICES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        {withPassword && (
          <Field
            label="Temporary password"
            htmlFor="password"
            hint="Share this with them privately. They'll be asked to change it the first time they log in."
            className="sm:col-span-2"
          >
            <div className="flex gap-2">
              <Input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={MIN_PASSWORD_LENGTH}
                required
                autoComplete="off"
                className="font-mono"
              />
              <Button variant="secondary" size="icon" onClick={() => setPassword(generateTempPassword())} aria-label="Generate a new password">
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </Field>
        )}
      </div>
      {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}
      <Button type="submit" className="w-full justify-center" disabled={busy}>{busy ? "Saving…" : submitLabel}</Button>
    </form>
  );
}
