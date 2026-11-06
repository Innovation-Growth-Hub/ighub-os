"use client";

/**
 * MOCK auth client.
 *
 * Shaped like Better Auth's React client (`createAuthClient()` from
 * "better-auth/react") with the `admin` plugin: `signIn.email`, `signOut`,
 * `useSession`, `changePassword`, `admin.createUser`, `admin.setUserPassword`.
 * Swapping to the real thing should only touch this file:
 *
 *   import { createAuthClient } from "better-auth/react";
 *   import { adminClient } from "better-auth/client/plugins";
 *   export const authClient = createAuthClient({ plugins: [adminClient()] });
 *
 * Account model: there is no public sign-up. The super admin creates every
 * account with a temporary password; the user must change it on first login.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/types";
import { useDb } from "@/lib/store";
import { MIN_PASSWORD_LENGTH } from "@/lib/mock/seed";
import { isComingSoon, isSuperAdmin, ROLE_LABELS } from "@/lib/auth/roles";

/** Cookie the proxy checks. Better Auth's default is `better-auth.session_token`. */
export const SESSION_COOKIE = "ighub.session_token";

type Result<T> = { data: T; error: null } | { data: null; error: { message: string } };

interface Session {
  user: User;
  session: { token: string; createdAt: string };
}

const useSessionStore = create<{ session: Session | null; set: (s: Session | null) => void }>()(
  persist((set) => ({ session: null, set: (session) => set({ session }) }), { name: "ighub-os-session" }),
);

function writeCookie(token: string | null) {
  document.cookie = token
    ? `${SESSION_COOKIE}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
    : `${SESSION_COOKIE}=; path=/; max-age=0`;
}

function startSession(user: User): Session {
  const token = `mock_${user.id}_${Date.now()}`;
  const session = { user, session: { token, createdAt: new Date().toISOString() } };
  useSessionStore.getState().set(session);
  writeCookie(token);
  return session;
}

function currentUser() {
  const id = useSessionStore.getState().session?.user.id;
  return useDb.getState().users.find((u) => u.id === id);
}

const fail = (message: string) => ({ data: null, error: { message } }) as const;
const delay = () => new Promise((r) => setTimeout(r, 350));

export const authClient = {
  signIn: {
    async email({ email, password }: { email: string; password: string }): Promise<Result<Session>> {
      await delay();
      const db = useDb.getState();
      const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user || db.passwords[user.id] !== password) return fail("Invalid email or password.");
      if (!user.isActive) return fail("This account is deactivated. Contact the super admin.");
      if (isComingSoon(user.role)) {
        return fail(`${ROLE_LABELS[user.role]} accounts are coming soon. You'll get an email when yours is ready.`);
      }
      return { data: startSession(user), error: null };
    },
  },

  async signOut() {
    useSessionStore.getState().set(null);
    writeCookie(null);
  },

  /** Better Auth: `changePassword({ currentPassword, newPassword, revokeOtherSessions })`. */
  async changePassword({
    currentPassword,
    newPassword,
  }: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions?: boolean;
  }): Promise<Result<{ ok: true }>> {
    await delay();
    const user = currentUser();
    if (!user) return fail("Your session has expired. Log in again.");
    const db = useDb.getState();
    if (db.passwords[user.id] !== currentPassword) return fail("Your current password is incorrect.");
    if (newPassword.length < MIN_PASSWORD_LENGTH) return fail(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (newPassword === currentPassword) return fail("Choose a password different from your current one.");
    db.setPassword(user.id, newPassword, false);
    return { data: { ok: true }, error: null };
  },

  /** Better Auth `admin` plugin. Server-side, these require the super admin role. */
  admin: {
    async createUser({
      password,
      data,
    }: {
      password: string;
      data: Omit<User, "id" | "joinedAt" | "isActive">;
    }): Promise<Result<{ user: User }>> {
      await delay();
      const actor = currentUser();
      if (!actor || !isSuperAdmin(actor.role)) return fail("Only the super admin can create accounts.");
      if (isComingSoon(data.role)) return fail(`${ROLE_LABELS[data.role]} accounts are coming soon.`);
      const db = useDb.getState();
      if (db.users.some((u) => u.email.toLowerCase() === data.email.trim().toLowerCase())) {
        return fail("An account with this email already exists.");
      }
      if (password.length < MIN_PASSWORD_LENGTH) return fail(`Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      const user = db.createAccount({ ...data, email: data.email.trim() }, password);
      db.log(actor.id, `created an account for ${user.name} (${ROLE_LABELS[user.role]})`);
      return { data: { user }, error: null };
    },

    async setUserPassword({ userId, newPassword }: { userId: string; newPassword: string }): Promise<Result<{ ok: true }>> {
      await delay();
      const actor = currentUser();
      if (!actor || !isSuperAdmin(actor.role)) return fail("Only the super admin can reset passwords.");
      if (newPassword.length < MIN_PASSWORD_LENGTH) return fail(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      useDb.getState().setPassword(userId, newPassword, true);
      return { data: { ok: true }, error: null };
    },
  },

  /** Same return shape as Better Auth's `useSession()`. */
  useSession() {
    const session = useSessionStore((s) => s.session);
    // Keep the session's user in sync with profile edits in the mock DB.
    const fresh = useDb((s) => (session ? s.users.find((u) => u.id === session.user.id) : undefined));
    return {
      data: session ? { ...session, user: fresh ?? session.user } : null,
      isPending: false,
    };
  },
};

/** Convenience for components under the authenticated shell. */
export function useCurrentUser(): User {
  const { data } = authClient.useSession();
  if (!data) throw new Error("useCurrentUser must be used inside the authenticated app shell");
  return data.user;
}

/** Readable temporary password for new accounts, e.g. "ighub-7k3m-q9tx". */
export function generateTempPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const pick = (n: number) =>
    Array.from(crypto.getRandomValues(new Uint32Array(n)), (v) => chars[v % chars.length]).join("");
  return `ighub-${pick(4)}-${pick(4)}`;
}
