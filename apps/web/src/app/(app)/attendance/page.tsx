import { Clock } from "lucide-react";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function AttendancePage() {
  return (
    <ComingSoon
      title="Attendance"
      icon={Clock}
      description="QR clock-in, late requests and penalties are being connected to the live system. Until then, keep using the current sign-in sheet."
    />
  );
}
