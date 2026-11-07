"use client";

/**
 * Better Auth React client. Talks to /api/auth/* on this origin (rewritten to
 * the NestJS API). There is no public sign-up: the super admin creates every
 * account through POST /api/v1/accounts.
 */
import { createAuthClient } from "better-auth/react";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { OfficeLocation, Role, StaffType, User } from "@ighub/shared";

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    inferAdditionalFields({
      user: {
        position: { type: "string", required: false },
        phone: { type: "string", required: false },
        staffType: { type: "string", required: false },
        officeLocation: { type: "string", required: false },
        company: { type: "string", required: false },
        mustChangePassword: { type: "boolean", required: false },
      },
    }),
  ],
});

export type SessionUser = User & { mustChangePassword: boolean };

type RawUser = NonNullable<ReturnType<typeof authClient.useSession>["data"]>["user"];

/** Better Auth's session user → our domain `User`. */
export function toUser(u: RawUser): SessionUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u.role ?? "staff") as Role,
    position: u.position ?? "",
    phone: u.phone ?? undefined,
    staffType: (u.staffType ?? undefined) as StaffType | undefined,
    officeLocation: (u.officeLocation ?? undefined) as OfficeLocation | undefined,
    company: u.company ?? undefined,
    isActive: !u.banned,
    joinedAt: new Date(u.createdAt).toISOString().slice(0, 10),
    mustChangePassword: Boolean(u.mustChangePassword),
  };
}

/** The signed-in user. Only use inside the authenticated app shell. */
export function useCurrentUser(): SessionUser {
  const { data } = authClient.useSession();
  if (!data) throw new Error("useCurrentUser must be used inside the authenticated app shell");
  return toUser(data.user);
}
