import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { BrandLoader } from "@/components/ui/brand-loader";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Set your password" };

export default function ChangePasswordPage() {
  return (
    <AuthFrame message="Make it yours!">
      <Suspense fallback={<BrandLoader label="Loading…" className="min-h-64" />}>
        <ChangePasswordForm />
      </Suspense>
    </AuthFrame>
  );
}
