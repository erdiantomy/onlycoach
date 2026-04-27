import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSavedPosts } from "@/hooks/useSavedPosts";

describe("useSavedPosts", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("starts empty", () => {
    const { result } = renderHook(() => useSavedPosts());
    expect(result.current.saved).toEqual([]);
    expect(result.current.isSaved("p1")).toBe(false);
  });

  it("toggles a post into and out of the set", () => {
    const { result } = renderHook(() => useSavedPosts());
    act(() => result.current.toggle("p1"));
    expect(result.current.isSaved("p1")).toBe(true);
    expect(result.current.saved).toEqual(["p1"]);
    act(() => result.current.toggle("p1"));
    expect(result.current.isSaved("p1")).toBe(false);
    expect(result.current.saved).toEqual([]);
  });

  it("persists across hook instances via localStorage", () => {
    const first = renderHook(() => useSavedPosts());
    act(() => first.result.current.toggle("p2"));
    first.unmount();
    const second = renderHook(() => useSavedPosts());
    expect(second.result.current.isSaved("p2")).toBe(true);
  });
});
