"use client";

import { useCurrentUser } from "@/lib/auth/auth-client";
import { isAdmin } from "@ighub/shared";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { MemberDashboard } from "@/components/dashboard/member-dashboard";

/** Client and student dashboards return when those roles launch. */
export default function DashboardPage() {
  const user = useCurrentUser();
  if (isAdmin(user.role)) return <AdminDashboard />;
  return <MemberDashboard user={user} />;
}
