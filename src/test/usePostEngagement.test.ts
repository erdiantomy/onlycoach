import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// Avoid the network mirror — we only test the local optimistic state.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({
      insert: async () => ({}),
      delete: () => ({ eq: () => ({ eq: async () => ({}) }) }),
    }),
  },
}));

import { usePostEngagement } from "@/hooks/usePostEngagement";

describe("usePostEngagement", () => {
  beforeEach(() => { window.localStorage.clear(); });
  afterEach(() => { window.localStorage.clear(); });

  it("toggles a like on and off", () => {
    const { result } = renderHook(() => usePostEngagement());
    expect(result.current.isLiked("p1")).toBe(false);
    act(() => result.current.toggleLike("p1"));
    expect(result.current.isLiked("p1")).toBe(true);
    act(() => result.current.toggleLike("p1"));
    expect(result.current.isLiked("p1")).toBe(false);
  });

  it("adds and removes a comment", () => {
    const { result } = renderHook(() => usePostEngagement());
    act(() => result.current.addComment("p2", "  great post!  "));
    const comments = result.current.commentsFor("p2");
    expect(comments).toHaveLength(1);
    expect(comments[0].body).toBe("great post!");
    act(() => result.current.removeComment(comments[0].id));
    expect(result.current.commentsFor("p2")).toHaveLength(0);
  });

  it("ignores empty comments", () => {
    const { result } = renderHook(() => usePostEngagement());
    act(() => result.current.addComment("p3", "   "));
    expect(result.current.commentsFor("p3")).toEqual([]);
  });
});
