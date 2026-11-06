import type { FundRequest, FundRequestStatus, User } from "@/lib/types";
import type { FundRequestDecision } from "@/lib/store";
import { ACCOUNTANT_APPROVAL_LIMIT } from "@/lib/mock/seed";

/**
 * Fund request policy (mirrors the future API rule):
 *
 *   staff ──submit──▶ pending_review ──accountant forwards──▶ forwarded ──super admin approves──▶ approved ──accountant disburses──▶ disbursed
 *                           │                                      │
 *                           └──accountant rejects──▶ rejected ◀────┴──super admin rejects
 *
 * Below ACCOUNTANT_APPROVAL_LIMIT (₦50k) the accountant may approve directly.
 * The super admin can also decide straight from pending_review (e.g. when the
 * accountant is away or is the requester). Nobody else reviews their own request.
 */
export function allowedDecisions(req: FundRequest, user: User): FundRequestDecision[] {
  const own = req.requesterId === user.id;
  if (user.role === "super_admin") {
    if (req.status === "pending_review" || req.status === "forwarded") return ["approved", "rejected"];
    if (req.status === "approved") return ["disbursed"];
    return [];
  }
  if (user.role === "accountant" && !own) {
    if (req.status === "pending_review") {
      return withinAccountantLimit(req) ? ["approved", "forwarded", "rejected"] : ["forwarded", "rejected"];
    }
    if (req.status === "approved") return ["disbursed"];
  }
  return [];
}

export function withinAccountantLimit(req: FundRequest) {
  return req.amount < ACCOUNTANT_APPROVAL_LIMIT;
}

/** The requester (or a reviewer) attaches receipts once the money is approved or paid. */
export function canAddReceipt(req: FundRequest, user: User) {
  if (req.status !== "approved" && req.status !== "disbursed") return false;
  return req.requesterId === user.id || user.role === "accountant" || user.role === "super_admin";
}

/** Requests waiting on this user, in the order they should be handled. */
export function queueFor(requests: FundRequest[], user: User) {
  return requests
    .filter((r) => allowedDecisions(r, user).length > 0)
    .sort((a, b) => a.neededBy.localeCompare(b.neededBy));
}

export const STATUS_HINT: Record<FundRequestStatus, string> = {
  pending_review: "Waiting for the accountant to review",
  forwarded: "Waiting for the super admin to approve",
  approved: "Approved. Waiting for the accountant to pay out",
  rejected: "Not approved",
  disbursed: "Paid out",
};

export const DECISION_LABELS: Record<FundRequestDecision, string> = {
  forwarded: "Forward to super admin",
  approved: "Approve",
  rejected: "Reject",
  disbursed: "Mark as paid",
};
