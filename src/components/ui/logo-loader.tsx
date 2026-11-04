import { cn } from "@/lib/utils";

/**
 * Animated IGHub logo loader: the one loading indicator used across the app.
 * The animation lives inside the SVG (CSS keyframes), so a plain <img> is
 * enough and it honours prefers-reduced-motion on its own.
 * Regenerate the SVG with `node scripts/build-logo.mjs`.
 */
export function LogoLoader({
  fullScreen = false,
  label = "Loading IGHUB OS…",
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
      className={cn(
        "flex flex-col items-center justify-center",
        fullScreen ? "min-h-screen" : "min-h-[50vh]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- animated SVG must not go through the image optimiser */}
      <img
        src="/img-assets/ig-logo-animated.svg"
        alt=""
        width={1124}
        height={548}
        className={fullScreen ? "w-56 sm:w-64" : "w-40"}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
