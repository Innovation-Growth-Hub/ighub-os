"use client";

/**
 * MOCK auth client.
 *
 * Shaped like Better Auth's React client (`createAuthClient()` from
 * "better-auth/react"): `signIn.email`, `signUp.email`, `signOut`, `useSession`.
 * Swapping to the real thing should only touch this file:
 *
 *   import { createAuthClient } from "better-auth/react";
 *   export const authClient = createAuthClient({ baseURL: process.env.NEXT_PUBLIC_API_URL });
 *
 * Roles will come from Better Auth's `admin` plugin (`user.role`).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, User } from "@/lib/types";
import { useDb } from "@/lib/store";
import { DEMO_PASSWORD } from "@/lib/mock/seed";

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

const delay = () => new Promise((r) => setTimeout(r, 350));

export const authClient = {
  signIn: {
    async email({ email, password }: { email: string; password: string }): Promise<Result<Session>> {
      await delay();
      const user = useDb.getState().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user || password !== DEMO_PASSWORD) {
        return { data: null, error: { message: "Invalid email or password." } };
      }
      if (!user.isActive) return { data: null, error: { message: "This account is deactivated." } };
      return { data: startSession(user), error: null };
    },
  },
  signUp: {
    async email({ name, email }: { name: string; email: string; password: string }): Promise<Result<Session>> {
      await delay();
      const db = useDb.getState();
      if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return { data: null, error: { message: "An account with this email already exists." } };
      }
      // Self sign-ups join as students; admins assign other roles.
      const user = db.addUser({ name, email, role: "student" as Role, position: "Student" });
      return { data: startSession(user), error: null };
    },
  },
  async signOut() {
    useSessionStore.getState().set(null);
    writeCookie(null);
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
