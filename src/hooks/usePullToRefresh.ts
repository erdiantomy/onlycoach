import { useEffect, useRef, useState } from "react";

interface Options {
  /** How far the user must pull (px) before a release triggers refresh. */
  threshold?: number;
  /** Async callback fired when the gesture releases past the threshold. */
  onRefresh: () => Promise<void> | void;
  /** Disable the gesture (e.g. for desktop). */
  disabled?: boolean;
}

interface State {
  pull: number;
  refreshing: boolean;
}

/**
 * Tiny touch-driven pull-to-refresh.
 *
 * Only engages when the page is scrolled to the top (window.scrollY === 0)
 * and the gesture starts with a downward swipe — so the rest of the page
 * still scrolls normally. Returns the current pull distance + a refreshing
 * flag so the caller can render an indicator.
 *
 * Used on the consumer Feed; everywhere else uses standard scroll.
 */
export const usePullToRefresh = ({ threshold = 80, onRefresh, disabled }: Options): State => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (disabled || typeof window === "undefined") return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // dampen for resistance
      setPull(Math.min(dy * 0.5, threshold * 1.5));
    };

    const onTouchEnd = async () => {
      if (refreshingRef.current) return;
      const released = pull;
      startY.current = null;
      if (released >= threshold) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [threshold, onRefresh, pull, disabled]);

  return { pull, refreshing };
};
