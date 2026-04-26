import { cn } from "@/lib/utils";
import logoSrc from "@/assets/only-coach-logo.svg";

interface LogoProps {
  className?: string;
  /**
   * `inline` — compact wordmark for headers/nav (default).
   * `stacked` — larger hero/auth wordmark.
   * Both render the same transparent SVG; only default sizing differs.
   * Override sizing via `className` (e.g. `h-10 md:h-12`).
   */
  variant?: "stacked" | "inline";
}

/**
 * Official ONLY/COACH wordmark.
 *
 * Sizing strategy:
 * - Height-driven so it aligns to header bars cleanly.
 * - `max-w-full` + `w-auto` keeps the wide wordmark from overflowing
 *   narrow mobile headers when paired with other actions.
 * - Explicit intrinsic width/height attrs preserve aspect ratio and
 *   prevent layout shift before the SVG decodes.
 * - `[image-rendering:auto]` lets the browser pick the sharpest scaler
 *   for the vector raster fallback in the WebView.
 */
export const Logo = ({ className, variant = "inline" }: LogoProps) => {
  const defaultSize =
    variant === "stacked"
      ? "h-12 sm:h-14 md:h-16"
      : "h-7 sm:h-8 md:h-9";

  return (
    <img
      src={logoSrc}
      alt="ONLY COACH"
      width={1500}
      height={900}
      decoding="async"
      draggable={false}
      className={cn(
        defaultSize,
        "w-auto max-w-full select-none object-contain",
        className,
      )}
    />
  );
};

export default Logo;
