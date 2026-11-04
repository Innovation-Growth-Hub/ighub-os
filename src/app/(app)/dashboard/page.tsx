"use client";

import { useCurrentUser } from "@/lib/auth/auth-client";
import { isAdmin } from "@/lib/auth/roles";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { ClientDashboard } from "@/components/dashboard/client-dashboard";
import { MemberDashboard } from "@/components/dashboard/member-dashboard";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";

export default function DashboardPage() {
  const user = useCurrentUser();
  if (isAdmin(user.role)) return <AdminDashboard />;
  if (user.role === "client") return <ClientDashboard user={user} />;
  if (user.role === "student") return <StudentDashboard user={user} />;
  return <MemberDashboard user={user} />;
}
