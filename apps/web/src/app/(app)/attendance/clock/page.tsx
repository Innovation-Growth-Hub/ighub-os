"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck, LogOut, MapPin, ScanLine } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { useDb } from "@/lib/store";
import { officeQrValue, parseOfficeQr } from "@/lib/attendance";
import { OFFICES } from "@/lib/mock/seed";
import type { OfficeLocation } from "@ighub/shared";
import { formatTime, toDateKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { AttendanceTabs } from "@/components/attendance/attendance-tabs";

/**
 * Clock in by scanning the office QR code.
 * Mock: the camera step is simulated. Paste a code or tap "Simulate scan".
 * Real build: camera scan (e.g. BarcodeDetector / zxing) + geolocation check.
 */
export default function ClockPage() {
  const user = useCurrentUser();
  const { attendance, clockIn, clockOut } = useDb();
  const [now, setNow] = useState(() => new Date());
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const today = toDateKey(now);
  const row = attendance.find((a) => a.userId === user.id && a.date === today);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  function submit(value: string) {
    setError(null);
    const parsed = parseOfficeQr(value);
    if (!parsed || !(parsed.office in OFFICES)) return setError("That isn't an IGHub attendance code.");
    if (parsed.date !== today) return setError("This code has expired. Scan today's code at the office.");
    clockIn(user.id, parsed.office as OfficeLocation);
    setCode("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit(code);
  }

  const office = user.officeLocation ?? "umuahia_hq";

  return (
    <>
      <PageHeader title="Attendance" />
      <AttendanceTabs />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card tone="mint" className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-bold text-muted">{now.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}</p>
          <p className="mt-2 text-6xl font-extrabold tracking-tight tabular-nums">
            {now.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
          <div className="mt-6">
            {row ? (
              <div className="space-y-2">
                <StatusBadge status={row.status} />
                <p className="text-sm font-semibold">
                  In at {row.clockIn ? formatTime(row.clockIn) : "—"} · {OFFICES[row.officeLocation]}
                  {row.clockOut && ` · Out at ${formatTime(row.clockOut)}`}
                </p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-muted">Not clocked in today</p>
            )}
          </div>
        </Card>

        <Card>
          {!row ? (
            <>
              <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-3xl bg-canvas">
                <ScanLine className="size-16 text-primary-ink" strokeWidth={1.5} aria-hidden />
                <p className="mt-3 text-sm font-bold">Point your camera at the office QR code</p>
                <p className="text-xs text-muted">Camera scanning arrives with the backend. Simulate it for now.</p>
                <Button className="mt-5" onClick={() => submit(officeQrValue(office, today))}>
                  <ScanLine className="size-4" /> Simulate scan at {OFFICES[office]}
                </Button>
              </div>
              <form onSubmit={onSubmit} className="mt-5 space-y-3">
                <Field label="Or paste the code" htmlFor="code" hint="From Office QR codes (admin) — e.g. IGHUB-ATT:aba_hub:YYYY-MM-DD">
                  <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="IGHUB-ATT:…" />
                </Field>
                <Button type="submit" variant="secondary" disabled={!code}>Clock in</Button>
              </form>
            </>
          ) : !row.clockOut ? (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <CircleCheck className="size-14 text-primary-ink" aria-hidden />
              <p className="mt-3 text-lg font-extrabold">You&apos;re clocked in</p>
              <p className="flex items-center gap-1 text-sm text-muted"><MapPin className="size-4" /> {OFFICES[row.officeLocation]}</p>
              <Button className="mt-6" variant="secondary" onClick={() => clockOut(user.id)}>
                <LogOut className="size-4" /> Clock out
              </Button>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-10 text-center">
              <CircleCheck className="size-14 text-primary-ink" aria-hidden />
              <p className="mt-3 text-lg font-extrabold">Done for today</p>
              <p className="text-sm text-muted">Worked {row.clockIn && Math.max(0, Math.round((new Date(row.clockOut).getTime() - new Date(row.clockIn).getTime()) / 36e5 * 10) / 10)} hours.</p>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              <CircleAlert className="size-4" /> {error}
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
