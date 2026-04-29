import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useReviews } from "@/hooks/useReviews";

describe("useReviews", () => {
  beforeEach(() => { window.localStorage.clear(); });
  afterEach(() => { window.localStorage.clear(); });

  it("starts empty", () => {
    const { result } = renderHook(() => useReviews("c1"));
    expect(result.current.reviews).toEqual([]);
    expect(result.current.average).toBeNull();
    expect(result.current.total).toBe(0);
  });

  it("submits a review and computes the average", () => {
    const { result } = renderHook(() => useReviews("c1"));
    act(() => { result.current.submit(5, "Excellent", "Mei"); });
    act(() => { result.current.submit(3, "Okay",      "Bud"); });
    expect(result.current.total).toBe(2);
    expect(result.current.average).toBeCloseTo(4);
    // Newest first
    expect(result.current.reviews[0].body).toBe("Okay");
  });

  it("scopes reviews per coach", () => {
    const a = renderHook(() => useReviews("c1"));
    const b = renderHook(() => useReviews("c2"));
    act(() => { a.result.current.submit(4, "Good", "X"); });
    expect(a.result.current.total).toBe(1);
    expect(b.result.current.total).toBe(0);
  });

  it("clamps the rating to 1..5", () => {
    const { result } = renderHook(() => useReviews("c1"));
    act(() => { result.current.submit(99, "", "X"); });
    expect(result.current.reviews[0].rating).toBe(5);
    act(() => { result.current.submit(0, "", "X"); });
    expect(result.current.reviews[0].rating).toBe(1);
  });
});
