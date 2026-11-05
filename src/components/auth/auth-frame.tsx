import type { ReactNode } from "react";
import Image from "next/image";
import { Mascot } from "./mascot";

/** Minimal auth screen: the mascot on one side, the form on the other. Stacks on mobile. */
export function AuthFrame({ message, children }: { message: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen items-center gap-6 px-4 py-8 sm:px-8 lg:grid-cols-2 lg:gap-12 lg:px-16">
      <div className="flex justify-center lg:justify-end">
        <Mascot message={message} className="h-56 w-auto sm:h-72 lg:h-[30rem]" />
      </div>
      <div className="mx-auto w-full max-w-sm lg:mx-0">
        <Image src="/img-assets/ig-logo.png" alt="IGHub, Innovation Growth Hub" width={100} height={49} className="mb-10" loading="eager" />
        {children}
      </div>
    </main>
  );
}
