import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "oc_reviews";

export interface Review {
  id: string;
  coachId: string;
  rating: number;
  body: string;
  authorName: string;
  createdAt: string;
}

const readJson = (): Review[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Review[]) : [];
  } catch {
    return [];
  }
};

const writeJson = (items: Review[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

/**
 * Local-first coach reviews. In production these would live in a
 * `coach_reviews` table; for the demo + offline-first UX we keep
 * them in localStorage so the UI is fully interactive without a
 * database round-trip.
 */
export const useReviews = (coachId: string) => {
  const [items, setItems] = useState<Review[]>(() => readJson());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readJson());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const forCoach = items.filter((r) => r.coachId === coachId);
  const average = forCoach.length === 0
    ? null
    : forCoach.reduce((s, r) => s + r.rating, 0) / forCoach.length;

  const submit = useCallback((rating: number, body: string, authorName: string) => {
    const review: Review = {
      id: `rv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      coachId,
      rating: Math.min(5, Math.max(1, Math.round(rating))),
      body: body.trim(),
      authorName: authorName.trim() || "Anonymous",
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => {
      const next = [review, ...prev];
      writeJson(next);
      return next;
    });
    return review;
  }, [coachId]);

  return { reviews: forCoach, average, total: forCoach.length, submit };
};
