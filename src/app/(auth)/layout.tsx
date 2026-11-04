import { Clock, FolderKanban, GraduationCap, Wallet } from "lucide-react";

const highlights = [
  { icon: Clock, text: "QR attendance with automatic late tracking" },
  { icon: FolderKanban, text: "Projects, tasks and clients in one place" },
  { icon: GraduationCap, text: "Courses, cohorts and student progress" },
  { icon: Wallet, text: "Revenue, expenses and invoices at a glance" },
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-mint p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary font-black text-on-primary">IG</span>
          <span className="text-xl font-extrabold tracking-tight">IGHUB OS</span>
        </div>
        <div>
          <h1 className="max-w-md text-4xl leading-tight font-extrabold tracking-tight">
            Run the whole hub from one calm place.
          </h1>
          <ul className="mt-10 space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 font-semibold">
                <span className="flex size-10 items-center justify-center rounded-full bg-canvas">
                  <Icon className="size-5 text-primary-ink" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm font-semibold text-ink/70">Innovation Growth Hub · Abia State, Nigeria</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}
