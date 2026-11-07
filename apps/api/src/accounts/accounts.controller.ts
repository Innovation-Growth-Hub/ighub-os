import { Body, Controller, Get, HttpCode, Param, Patch, Post, Req } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import {
  canManageAccounts,
  createAccountSchema,
  isAdmin,
  setAccountStatusSchema,
  updateAccountSchema,
  updateMeSchema,
  type CreateAccountInput,
  type UpdateMeInput,
  type SetAccountStatusInput,
  type UpdateAccountInput,
} from "@ighub/shared";
import { AllowPendingPasswordChange, AllowRoles, CurrentUser } from "../auth/decorators.js";
import type { AuthedRequest, AuthUser } from "../auth/types.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { AccountsService, type Actor } from "./accounts.service.js";

const actorOf = (req: AuthedRequest): Actor => ({
  user: req.auth.user,
  headers: fromNodeHeaders(req.headers),
  ip: req.ip,
});

@Controller()
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  /** The signed-in user. Reachable before the first-login password change, so the web app can redirect. */
  @Get("me")
  @AllowPendingPasswordChange()
  me(@CurrentUser() user: AuthUser) {
    return this.accounts.get(user.id);
  }

  /** Edit your own name and phone. */
  @Patch("me")
  updateMe(@CurrentUser() user: AuthUser, @Body(new ZodPipe(updateMeSchema)) body: UpdateMeInput) {
    return this.accounts.updateSelf(user.id, body);
  }

  /**
   * Everyone signed in can look up colleagues (names on tasks, meetings, logs).
   * Phone numbers are only shown to admins.
   */
  @Get("directory")
  async directory(@CurrentUser() user: AuthUser) {
    const all = await this.accounts.list();
    return isAdmin(user.role) ? all : all.map(({ phone: _phone, ...rest }) => rest);
  }

  /** Staff list: super admin and admin (admin is read-only). */
  @Get("accounts")
  @AllowRoles(isAdmin)
  list() {
    return this.accounts.list();
  }

  @Get("accounts/:id")
  @AllowRoles(isAdmin)
  get(@Param("id") id: string) {
    return this.accounts.get(id);
  }

  /** Returns `{ account, temporaryPassword }`. Show the password once; it can't be read again. */
  @Post("accounts")
  @AllowRoles(canManageAccounts)
  create(@Body(new ZodPipe(createAccountSchema)) body: CreateAccountInput, @Req() req: AuthedRequest) {
    return this.accounts.create(body, actorOf(req));
  }

  @Patch("accounts/:id")
  @AllowRoles(canManageAccounts)
  update(@Param("id") id: string, @Body(new ZodPipe(updateAccountSchema)) body: UpdateAccountInput, @Req() req: AuthedRequest) {
    return this.accounts.update(id, body, actorOf(req));
  }

  @Patch("accounts/:id/status")
  @AllowRoles(canManageAccounts)
  setStatus(@Param("id") id: string, @Body(new ZodPipe(setAccountStatusSchema)) body: SetAccountStatusInput, @Req() req: AuthedRequest) {
    return this.accounts.setActive(id, body.active, actorOf(req));
  }

  /** Returns `{ temporaryPassword }`. */
  @Post("accounts/:id/reset-password")
  @HttpCode(200)
  @AllowRoles(canManageAccounts)
  resetPassword(@Param("id") id: string, @Req() req: AuthedRequest) {
    return this.accounts.resetPassword(id, actorOf(req));
  }
}
