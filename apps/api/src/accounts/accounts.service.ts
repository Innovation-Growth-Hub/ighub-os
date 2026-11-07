import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  generateTempPassword,
  type CreateAccountInput,
  type UpdateAccountInput,
} from "@ighub/shared";
import { AUTH, type Auth } from "../auth/auth.js";
import type { AuthUser } from "../auth/types.js";
import { AuditService } from "../common/audit.service.js";
import { AccountsRepository } from "./accounts.repository.js";

/** Who is acting, and the headers Better Auth needs to re-check their permission. */
export interface Actor {
  user: AuthUser;
  headers: Headers;
  ip?: string;
}

/**
 * Account lifecycle (AUTH-ARCHITECTURE §6.2–6.5). The controller already limits
 * these to the super admin; Better Auth's admin plugin checks again on every
 * call because we pass the actor's headers through.
 */
@Injectable()
export class AccountsService {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    private readonly repo: AccountsRepository,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.repo.list();
  }

  async get(id: string) {
    const account = await this.repo.findById(id);
    if (!account) throw new NotFoundException({ code: "account_not_found", message: "Account not found." });
    return account;
  }

  /** Creates the account with a temporary password. The password is returned once and never stored in plain text. */
  async create(input: CreateAccountInput, actor: Actor) {
    const temporaryPassword = input.password ?? generateTempPassword();
    const { user } = await this.auth.api.createUser({
      body: { email: input.email, name: input.name, password: temporaryPassword, role: input.role },
      headers: actor.headers,
    });
    const account = await this.repo.update(user.id, {
      position: input.position,
      phone: input.phone ?? null,
      staffType: input.staffType,
      officeLocation: input.officeLocation,
      mustChangePassword: true,
    });
    await this.audit.record({
      actorId: actor.user.id,
      action: "account.created",
      targetType: "user",
      targetId: user.id,
      ip: actor.ip,
      meta: { role: input.role, email: input.email },
    });
    return { account: account!, temporaryPassword };
  }

  async update(id: string, input: UpdateAccountInput, actor: Actor) {
    const current = await this.get(id);
    if (id === actor.user.id && input.role && input.role !== current.role) {
      throw new BadRequestException({ code: "cannot_change_own_role", message: "You can't change your own role." });
    }
    const account = await this.repo.update(id, {
      ...input,
      phone: input.phone === undefined ? undefined : input.phone || null,
    });
    await this.audit.record({
      actorId: actor.user.id,
      action: input.role && input.role !== current.role ? "account.role_changed" : "account.updated",
      targetType: "user",
      targetId: id,
      ip: actor.ip,
      meta: { fields: Object.keys(input), ...(input.role ? { from: current.role, to: input.role } : {}) },
    });
    return account!;
  }

  /** Deactivate = Better Auth ban (also revokes every session). */
  async setActive(id: string, active: boolean, actor: Actor) {
    await this.get(id);
    if (id === actor.user.id) {
      throw new BadRequestException({ code: "cannot_deactivate_self", message: "You can't deactivate your own account." });
    }
    if (active) await this.auth.api.unbanUser({ body: { userId: id }, headers: actor.headers });
    else await this.auth.api.banUser({ body: { userId: id, banReason: "Deactivated by the super admin" }, headers: actor.headers });
    await this.audit.record({
      actorId: actor.user.id,
      action: active ? "account.reactivated" : "account.deactivated",
      targetType: "user",
      targetId: id,
      ip: actor.ip,
    });
    return this.get(id);
  }

  /** New temporary password, forced change on next login, all sessions signed out. */
  async resetPassword(id: string, actor: Actor) {
    await this.get(id);
    const temporaryPassword = generateTempPassword();
    await this.auth.api.setUserPassword({ body: { userId: id, newPassword: temporaryPassword }, headers: actor.headers });
    await this.repo.update(id, { mustChangePassword: true });
    await this.auth.api.revokeUserSessions({ body: { userId: id }, headers: actor.headers });
    await this.audit.record({ actorId: actor.user.id, action: "account.password_reset", targetType: "user", targetId: id, ip: actor.ip });
    return { temporaryPassword };
  }
}
