import type { Attendance, User } from "@/lib/types";
import { toDateKey } from "@/lib/utils";

/** Distinct attendance dates, newest first. */
export function attendanceDates(attendance: Attendance[]) {
  return [...new Set(attendance.map((a) => a.date))].sort().reverse();
}

export function workers(users: User[]) {
  return users.filter((u) => u.isActive && !["client", "student"].includes(u.role));
}

/** Present (on-time + late) per day for the last `n` recorded days, oldest first. */
export function dailyPresence(attendance: Attendance[], n: number) {
  const dates = attendanceDates(attendance).slice(0, n).reverse();
  return dates.map((date) => {
    const day = attendance.filter((a) => a.date === date);
    return {
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString("en-NG", { weekday: "short", day: "numeric" }),
      present: day.filter((a) => a.status !== "absent").length,
      onTime: day.filter((a) => a.status === "on_time").length,
      late: day.filter((a) => a.status === "late").length,
      absent: day.filter((a) => a.status === "absent").length,
      total: day.length,
    };
  });
}

/** On-time rate (%) by weekday (rows Mon–Fri) × week (columns), for a heatmap. */
export function onTimeHeatmap(attendance: Attendance[], weeks: number) {
  const rows = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const dates = attendanceDates(attendance);
  const latest = dates[0] ? new Date(`${dates[0]}T00:00:00`) : new Date();
  const monday = new Date(latest);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  const weekStarts: Date[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const d = new Date(monday);
    d.setDate(d.getDate() - w * 7);
    weekStarts.push(d);
  }
  const columns = weekStarts.map((d) => d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }));
  const values = rows.map((_, ri) =>
    weekStarts.map((ws) => {
      const d = new Date(ws);
      d.setDate(d.getDate() + ri);
      const day = attendance.filter((a) => a.date === toDateKey(d));
      if (!day.length) return null;
      return Math.round((day.filter((a) => a.status === "on_time").length / day.length) * 100);
    }),
  );
  return { rows, columns, values };
}

/**
 * Office QR payload. Rotates daily so a photo of yesterday's code is useless.
 * The backend will sign this (HMAC) and verify location; the mock only checks shape + date.
 */
export function officeQrValue(office: string, dateKey: string) {
  return `IGHUB-ATT:${office}:${dateKey}`;
}

export function parseOfficeQr(value: string): { office: string; date: string } | null {
  const m = /^IGHUB-ATT:([a-z_]+):(\d{4}-\d{2}-\d{2})$/.exec(value.trim());
  return m ? { office: m[1], date: m[2] } : null;
}
