import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { fromNodeHeaders } from "better-auth/node";
import { isComingSoon, type Role } from "@ighub/shared";
import { ENV, type Env } from "../config/env.js";
import { AUTH, type Auth } from "./auth.js";
import { ALLOW_PENDING_PASSWORD, IS_PUBLIC, ROLE_POLICY } from "./decorators.js";
import type { AuthedRequest, AuthUser } from "./types.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Global guard for /api/v1. In order:
 *  1. @Public() routes pass.
 *  2. Unsafe methods must come from a trusted origin (CSRF; Better Auth does
 *     the same for /api/auth).
 *  3. A valid Better Auth session is required → 401.
 *  4. Deactivated or not-yet-launched roles → 403.
 *  5. A temporary password must be changed first → 403 password_change_required.
 *  6. @AllowRoles(policy) must pass → 403.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    @Inject(ENV) private readonly env: Env,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();

    const origin = req.headers.origin;
    if (!SAFE_METHODS.has(req.method) && origin && !this.env.WEB_ORIGINS.includes(origin)) {
      throw new ForbiddenException({ code: "untrusted_origin", message: "Request origin is not allowed." });
    }

    const result = await this.auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!result) throw new UnauthorizedException({ code: "unauthenticated", message: "Log in to continue." });

    const user = result.user as unknown as AuthUser;
    if (user.banned) throw new ForbiddenException({ code: "account_deactivated", message: "This account is deactivated." });
    if (isComingSoon(user.role)) throw new ForbiddenException({ code: "role_coming_soon", message: "This role isn't available yet." });

    const allowPending = this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_PASSWORD, targets);
    if (user.mustChangePassword && !allowPending) {
      throw new ForbiddenException({
        code: "password_change_required",
        message: "Set your own password before continuing.",
      });
    }

    req.auth = { user, session: result.session };

    const policy = this.reflector.getAllAndOverride<((role: Role) => boolean) | undefined>(ROLE_POLICY, targets);
    if (policy && !policy(user.role)) {
      throw new ForbiddenException({ code: "forbidden", message: "You don't have permission to do this." });
    }
    return true;
  }
}
