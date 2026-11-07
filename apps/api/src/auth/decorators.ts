import { createParamDecorator, SetMetadata, type ExecutionContext } from "@nestjs/common";
import type { Role } from "@ighub/shared";
import type { AuthedRequest, AuthUser } from "./types.js";

export const IS_PUBLIC = "auth:public";
export const ALLOW_PENDING_PASSWORD = "auth:allowPendingPassword";
export const ROLE_POLICY = "auth:rolePolicy";

/** No session needed (health checks). Everything else requires one. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Reachable while the user still has to replace a temporary password (e.g. GET /me). */
export const AllowPendingPasswordChange = () => SetMetadata(ALLOW_PENDING_PASSWORD, true);

/**
 * Restrict a route by role, using the same predicates the web app uses, e.g.
 * `@AllowRoles(canManageAccounts)` or `@AllowRoles(isAdmin)`.
 */
export const AllowRoles = (policy: (role: Role) => boolean) => SetMetadata(ROLE_POLICY, policy);

/** The signed-in user (set by AuthGuard). */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest<AuthedRequest>().auth.user;
});
