"use client";

import type { FormEvent } from "react";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { OFFICES } from "@/lib/mock/seed";
import type { OfficeLocation, Role, StaffType, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";

export const STAFF_TYPE_LABELS: Record<StaffType, string> = {
  core_team: "Core Team",
  corper: "Corper (NYSC)",
  intern: "Intern",
};

const STAFF_ROLES: Role[] = ["staff", "admin", "project_manager", "trainer", "social_media_manager", "super_admin"];

export type StaffInput = Pick<User, "name" | "email" | "role" | "position" | "phone" | "staffType" | "officeLocation">;

export function StaffForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Partial<User>;
  onSubmit: (v: StaffInput) => void;
  submitLabel: string;
}) {
  function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    onSubmit({
      name: String(f.get("name")),
      email: String(f.get("email")),
      phone: String(f.get("phone")) || undefined,
      position: String(f.get("position")),
      role: f.get("role") as Role,
      staffType: f.get("staffType") as StaffType,
      officeLocation: f.get("officeLocation") as OfficeLocation,
    });
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
          <Input id="position" name="position" required defaultValue={initial?.position} />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" defaultValue={initial?.phone} />
        </Field>
        <Field label="Staff type" htmlFor="staffType">
          <Select id="staffType" name="staffType" defaultValue={initial?.staffType ?? "core_team"}>
            {Object.entries(STAFF_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Role" htmlFor="role">
          <Select id="role" name="role" defaultValue={initial?.role ?? "staff"}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
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
      </div>
      <Button type="submit" className="w-full justify-center">{submitLabel}</Button>
    </form>
  );
}
