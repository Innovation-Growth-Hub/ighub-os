import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";
import { schema, type Database } from "@ighub/db";
import { ALL_ROLES, isComingSoon, MIN_PASSWORD_LENGTH, ROLE_LABELS, type Role } from "@ighub/shared";
import type { Env } from "../config/env.js";

/**
 * Better Auth access control for its admin endpoints (create user, set role,
 * ban, set password, sessions). Only the super admin holds these; every other
 * role exists so Better Auth recognises it, with no admin permissions.
 * Domain permissions (tasks, finance, …) are enforced by our own guards.
 */
const ac = createAccessControl(defaultStatements);
const noAdminPowers = ac.newRole({ user: [], session: [] });
const superAdmin = ac.newRole({
  user: ["create", "list", "set-role", "ban", "delete", "set-password", "set-email", "get", "update"],
  session: ["list", "revoke", "delete"],
});
const roles = Object.fromEntries(ALL_ROLES.map((r) => [r, r === "super_admin" ? superAdmin : noAdminPowers])) as Record<
  Role,
  typeof noAdminPowers
>;

export function createAuth(db: Database, env: Env) {
  return betterAuth({
    appName: "IGHubOs",
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.WEB_ORIGINS,
    database: drizzleAdapter(db, { provider: "mysql", schema }),

    emailAndPassword: {
      enabled: true,
      // No public sign-up: the super admin creates every account (AUTH-ARCHITECTURE §6.2).
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: 128,
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh daily
    },

    user: {
      additionalFields: {
        position: { type: "string", required: false, input: false },
        phone: { type: "string", required: false, input: false },
        staffType: { type: "string", required: false, input: false },
        officeLocation: { type: "string", required: false, input: false },
        company: { type: "string", required: false, input: false },
        mustChangePassword: { type: "boolean", required: false, defaultValue: false, input: false },
      },
    },

    plugins: [
      admin({
        ac,
        roles,
        defaultRole: "staff",
        adminRoles: ["super_admin"],
        bannedUserMessage: "This account is deactivated. Contact the super admin.",
      }),
    ],

    databaseHooks: {
      session: {
        create: {
          // Roles that haven't launched can't sign in, even if an account exists.
          before: async (session, ctx) => {
            const found = await ctx?.context.internalAdapter.findUserById(session.userId);
            const role = (found as { role?: Role } | null)?.role;
            if (role && isComingSoon(role)) {
              throw new APIError("FORBIDDEN", {
                message: `${ROLE_LABELS[role]} accounts are coming soon.`,
                code: "ROLE_COMING_SOON",
              });
            }
          },
        },
      },
    },

    hooks: {
      // A successful password change clears the "must change on first login" flag.
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/change-password") return;
        if (ctx.context.returned instanceof Error) return;
        const userId = ctx.context.session?.user.id;
        if (userId) await ctx.context.internalAdapter.updateUser(userId, { mustChangePassword: false });
      }),
    },

    rateLimit: {
      enabled: env.NODE_ENV === "production",
      window: 60,
      max: 100,
      customRules: { "/sign-in/email": { window: 60, max: 5 } },
    },

    advanced: {
      database: { generateId: () => randomUUID() },
      useSecureCookies: env.NODE_ENV === "production",
    },

    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export const AUTH = Symbol("AUTH");
