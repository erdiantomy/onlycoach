import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// vi.mock is hoisted, so factory bodies must NOT reference outer
// variables. We capture the spies via `vi.hoisted` so they can be
// inspected after each call.
const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: () => {} } },
  })),
  getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: mocks.signInWithOAuth,
      signInWithPassword: mocks.signInWithPassword,
      signInWithOtp: mocks.signInWithOtp,
      onAuthStateChange: mocks.onAuthStateChange,
      getSession: mocks.getSession,
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// AppShell pulls in OfflineBanner → useOnlineStatus, which dynamically
// imports @capacitor/network. The web build externalizes that, but
// vitest doesn't, so stub the layout shell to keep the test focused.
vi.mock("@/components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import Auth from "@/pages/Auth";

const renderAuth = (initial = "/auth") =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<div>routed</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("Auth page", () => {
  beforeEach(() => {
    mocks.signInWithOAuth.mockReset().mockResolvedValue({ error: null });
    mocks.signInWithPassword.mockReset().mockResolvedValue({ error: null });
    mocks.signInWithOtp.mockReset().mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders Google + Apple buttons", () => {
    renderAuth();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with apple/i })).toBeInTheDocument();
  });

  it("Google sign-in points the redirect at /auth/callback with the configured next param", async () => {
    renderAuth("/auth?from=/coach/maya");
    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    await waitFor(() => expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(1));
    const arg = mocks.signInWithOAuth.mock.calls[0][0];
    expect(arg.provider).toBe("google");
    expect(arg.options.redirectTo).toContain("/auth/callback");
    expect(arg.options.redirectTo).toContain(encodeURIComponent("/coach/maya"));
  });

  it("Apple sign-in routes through the same callback", async () => {
    renderAuth();
    fireEvent.click(screen.getByRole("button", { name: /continue with apple/i }));
    await waitFor(() => expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(1));
    expect(mocks.signInWithOAuth.mock.calls[0][0].provider).toBe("apple");
    expect(mocks.signInWithOAuth.mock.calls[0][0].options.redirectTo).toContain("/auth/callback");
  });

  it("email sign-in posts the entered credentials", async () => {
    const { container } = renderAuth();
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "fan@example.test" } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: "supersecret" } });
    const submit = container.querySelector('button[type="submit"]');
    expect(submit).toBeTruthy();
    fireEvent.click(submit as Element);
    await waitFor(() => expect(mocks.signInWithPassword).toHaveBeenCalledTimes(1));
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "fan@example.test", password: "supersecret" });
  });
});
