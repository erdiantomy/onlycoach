import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";

describe("useNotificationPrefs", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("starts with sensible defaults", () => {
    const { result } = renderHook(() => useNotificationPrefs());
    expect(result.current.prefs.newMessage.push).toBe(true);
    expect(result.current.prefs.newMessage.sms).toBe(false);
  });

  it("setChannel persists and updates the matrix", () => {
    const { result } = renderHook(() => useNotificationPrefs());
    act(() => result.current.setChannel("newPost", "email", false));
    expect(result.current.prefs.newPost.email).toBe(false);
    // unrelated cells unchanged
    expect(result.current.prefs.newPost.push).toBe(true);
  });

  it("reset wipes back to defaults", () => {
    const { result } = renderHook(() => useNotificationPrefs());
    act(() => result.current.setChannel("subscription", "push", false));
    act(() => result.current.reset());
    expect(result.current.prefs.subscription.push).toBe(true);
  });
});
