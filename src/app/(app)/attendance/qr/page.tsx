"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Printer } from "lucide-react";
import { officeQrValue } from "@/lib/attendance";
import { OFFICES } from "@/lib/mock/seed";
import { toDateKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { AttendanceTabs } from "@/components/attendance/attendance-tabs";

export default function OfficeQrPage() {
  const [today] = useState(() => toDateKey(new Date()));
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Codes rotate every day. Display them on the office screen or print them each morning."
        actions={<Button variant="secondary" onClick={() => window.print()}><Printer className="size-4" /> Print</Button>}
      />
      <AttendanceTabs />
      <div className="grid gap-6 md:grid-cols-2">
        {Object.entries(OFFICES).map(([key, name]) => {
          const value = officeQrValue(key, today);
          return (
            <Card key={key} className="flex flex-col items-center text-center">
              <p className="text-lg font-extrabold">{name}</p>
              <p className="text-sm text-muted">Valid for {new Date(`${today}T00:00:00`).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}</p>
              <div className="my-6 rounded-3xl bg-canvas p-6">
                <QRCodeSVG value={value} size={200} fgColor="#1F2937" bgColor="#FFFFFF" level="M" />
              </div>
              <code className="rounded-xl bg-canvas px-3 py-1.5 text-xs font-semibold">{value}</code>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={async () => {
                  await navigator.clipboard.writeText(value);
                  setCopied(key);
                }}
              >
                <Copy className="size-4" /> {copied === key ? "Copied" : "Copy code"}
              </Button>
            </Card>
          );
        })}
      </div>
    </>
  );
}
