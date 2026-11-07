import type { Request } from "express";
import type { Role } from "@ighub/shared";
import type { Auth } from "./auth.js";

type InferredSession = Auth["$Infer"]["Session"];

/** Session user with our role union instead of Better Auth's plain string. */
export type AuthUser = Omit<InferredSession["user"], "role"> & { role: Role };
export type AuthSession = InferredSession["session"];

export interface AuthedRequest extends Request {
  auth: { user: AuthUser; session: AuthSession };
}
