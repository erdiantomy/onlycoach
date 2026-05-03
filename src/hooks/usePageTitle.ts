import { useEffect } from "react";

const SUFFIX = "ONLY/COACH";

/**
 * Sets document.title for the current route. Pass `null`/empty to
 * render just the suffix (used on the landing page). Restores the
 * previous title on unmount so flash-of-stale-title is avoided when
 * navigating between routes.
 */
export const usePageTitle = (title: string | null | undefined) => {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
    return () => {
      document.title = prev;
    };
  }, [title]);
};
