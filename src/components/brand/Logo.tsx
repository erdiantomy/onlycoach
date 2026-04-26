import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "stacked" | "inline";
}

/**
 * ONLY/COACH wordmark.
 * - "ONLY" mixes thin outline (ON) with heavy black (LY) for editorial tension.
 * - "COACH" sits below in deep forest green, uppercase heavy.
 * Pure SVG so it scales identically on web and inside the Capacitor WebView.
 */
export const Logo = ({ className, variant = "stacked" }: LogoProps) => {
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "inline-flex items-baseline gap-1 font-display leading-none",
          className,
        )}
        aria-label="ONLY COACH"
      >
        <span className="text-foreground tracking-tight">ONLY</span>
        <span className="text-primary tracking-tight">/COACH</span>
      </div>
    );
  }

  return (
    <div
      className={cn("inline-flex flex-col leading-[0.85]", className)}
      aria-label="ONLY COACH"
    >
      <span className="font-display text-[1.6em] tracking-tight">
        <span
          className="text-transparent"
          style={{ WebkitTextStroke: "1.5px hsl(var(--ink))" }}
        >
          ON
        </span>
        <span className="text-foreground">LY</span>
      </span>
      <span className="font-display text-[1.6em] tracking-tight text-primary">
        COACH
      </span>
    </div>
  );
};

export default Logo;
