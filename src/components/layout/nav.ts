import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  FolderKanban,
  GraduationCap,
  HandCoins,
  Handshake,
  LayoutDashboard,
  ListTodo,
  Megaphone,
  Settings,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "People",
    items: [
      { href: "/staff", label: "Staff", icon: Users },
      { href: "/attendance", label: "Attendance", icon: Clock },
      { href: "/tasks", label: "Tasks", icon: ListTodo },
      { href: "/daily-logs", label: "Daily logs", icon: ClipboardList },
    ],
  },
  {
    title: "Work",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/crm", label: "CRM", icon: Handshake },
      { href: "/lms", label: "Learning", icon: GraduationCap },
      { href: "/meetings", label: "Meetings", icon: CalendarDays },
      { href: "/documents", label: "Documents", icon: FileText },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/requests", label: "Fund requests", icon: HandCoins },
      { href: "/finance", label: "Finance", icon: Wallet },
      { href: "/social", label: "Social Media", icon: Megaphone },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/insights", label: "AI Insights", icon: Sparkles },
    ],
  },
  {
    title: "Account",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];
