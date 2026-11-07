import { cn } from "@/lib/utils";

const DOTS = ["bg-brand-navy", "bg-brand-green", "bg-brand-orange", "bg-brand-sky"];

/**
 * The app's one loading indicator: four dots in the IGHub colours, bouncing
 * in a wave. Pure CSS; motion stops under prefers-reduced-motion.
 */
export function BrandLoader({
  fullScreen = false,
  label = "Loading IGHubOs…",
  className,
}: {
  fullScreen?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-4", fullScreen ? "min-h-screen" : "min-h-[50vh]", className)}
    >
      <div className="flex items-end gap-2" aria-hidden>
        {DOTS.map((c, i) => (
          <span
            key={c}
            className={cn("size-3.5 rounded-full motion-safe:animate-[brand-bounce_1.1s_ease-in-out_infinite]", c)}
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
     
    </div>
  );
}
