import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "./constants.js";
import { COMING_SOON_ROLES, ROLE_LABELS } from "./roles.js";
import type { OfficeLocation, Role, StaffType } from "./types.js";

/**
 * Request schemas shared by the API (validation) and the web app (forms).
 * Keep them close to the domain types in types.ts.
 */

const roles = Object.keys(ROLE_LABELS) as [Role, ...Role[]];
const staffTypes = ["core_team", "corper", "intern"] as const satisfies readonly StaffType[];
const offices = ["umuahia_hq", "aba_hub"] as const satisfies readonly OfficeLocation[];

export const roleSchema = z.enum(roles);

/** Roles the super admin can create today (coming-soon roles are refused). */
export const liveRoleSchema = roleSchema.refine((r) => !COMING_SOON_ROLES.includes(r), {
  message: "This role is coming soon and can't be assigned yet.",
});

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(128);

const profileFields = {
  name: z.string().trim().min(2).max(120),
  position: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(32).optional(),
  staffType: z.enum(staffTypes),
  officeLocation: z.enum(offices),
};

/** POST /api/v1/accounts — super admin only. Omit `password` to have the API generate one. */
export const createAccountSchema = z.object({
  ...profileFields,
  // Trim and lowercase before validating, so pasted addresses with spaces still pass.
  email: z.string().trim().toLowerCase().pipe(z.email()),
  role: liveRoleSchema,
  password: passwordSchema.optional(),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

/** PATCH /api/v1/accounts/:id — super admin only. */
export const updateAccountSchema = z
  .object({ ...profileFields, role: liveRoleSchema })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update." });
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

/** PATCH /api/v1/accounts/:id/status — super admin only. */
export const setAccountStatusSchema = z.object({ active: z.boolean() });
export type SetAccountStatusInput = z.infer<typeof setAccountStatusSchema>;

/** PATCH /api/v1/me — users edit their own name and phone. */
export const updateMeSchema = z
  .object({ name: profileFields.name, phone: z.string().trim().max(32) })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update." });
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
