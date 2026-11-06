"use client";

import Link from "next/link";
import { HandCoins } from "lucide-react";
import { queueFor } from "@/lib/fund-requests";
import { useDb, userById } from "@/lib/store";
import type { User } from "@/lib/types";
import { formatDate, formatNaira } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";

/**
 * Reviewers (accountant, super admin) see what's waiting on them;
 * everyone else sees the status of their own latest requests.
 */
export function FundRequestsCard({ user, className }: { user: User; className?: string }) {
  const { fundRequests, users } = useDb();
  const reviewer = user.role === "accountant" || user.role === "super_admin";
  const rows = reviewer
    ? queueFor(fundRequests, user)
    : fundRequests.filter((r) => r.requesterId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Card className={className}>
      <CardHeader
        title={reviewer ? "Fund requests waiting on you" : "My fund requests"}
        description={reviewer ? `${rows.length} to handle` : undefined}
        action={<Link href="/requests" className="text-sm font-bold text-primary-ink hover:underline">{reviewer ? "Review" : "View all"}</Link>}
      />
      {rows.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <HandCoins className="size-4" aria-hidden />
          {reviewer ? "Nothing waiting. Nice." : "No requests yet. Need money for work? Create a request."}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 4).map((r) => (
            <li key={r.id}>
              <Link href="/requests" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-canvas p-4 hover:bg-mint-soft">
                <div className="min-w-0">
                  <p className="truncate font-bold">{r.title}</p>
                  <p className="text-xs text-muted">
                    {reviewer ? `${userById(users, r.requesterId)?.name} · ` : ""}needed by {formatDate(r.neededBy, { year: undefined })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold">{formatNaira(r.amount)}</span>
                  <StatusBadge status={r.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
