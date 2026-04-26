import { supabase } from "@/integrations/supabase/client";
import { requiresExternalCheckout, openOnWeb } from "@/lib/platform";

/** Detect if user should be routed to Xendit (SEA locales). */
export const shouldUseXendit = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const langs = [navigator.language, ...(navigator.languages ?? [])].map((l) => l.toLowerCase());
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  const seaTz = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Manila", "Asia/Kuala_Lumpur", "Asia/Singapore", "Asia/Bangkok", "Asia/Ho_Chi_Minh"];
  const seaLocaleMatch = langs.some((l) => /-(id|ph|my|sg|th|vn)\b/.test(l) || l.startsWith("id") || l.startsWith("tl"));
  return seaLocaleMatch || seaTz.includes(tz);
};

/**
 * App Store compliance: on native iOS we cannot initiate external payment
 * flows in-app (App Review Guideline 3.1.1). The native shell hides
 * subscribe / book buttons, but as a defense-in-depth check, every checkout
 * entry point also routes to the web equivalent if called on iOS.
 */
export const isCheckoutBlockedOnDevice = (): boolean => requiresExternalCheckout();

/** Subscribe — auto routes Stripe vs Xendit. iOS native opens web instead. */
export const startSubscriptionCheckout = async (tier_id: string, opts?: { coachHandle?: string }) => {
  if (requiresExternalCheckout()) {
    const path = opts?.coachHandle ? `/c/${opts.coachHandle}?subscribe=${tier_id}` : `/subscribe/${tier_id}`;
    await openOnWeb(path);
    return;
  }
  const fn = shouldUseXendit() ? "create-xendit-subscription" : "create-subscription-checkout";
  const { data, error } = await supabase.functions.invoke(fn, { body: { tier_id } });
  if (error) throw error;
  if (data?.url) window.location.href = data.url as string;
};

/** Book — auto routes Stripe vs Xendit. iOS native opens web instead. */
export const startBookingCheckout = async (slot_id: string, opts?: { coachHandle?: string }) => {
  if (requiresExternalCheckout()) {
    const path = opts?.coachHandle ? `/c/${opts.coachHandle}?book=${slot_id}` : `/book/${slot_id}`;
    await openOnWeb(path);
    return;
  }
  const fn = shouldUseXendit() ? "create-xendit-invoice" : "create-booking-checkout";
  const { data, error } = await supabase.functions.invoke(fn, { body: { slot_id } });
  if (error) throw error;
  if (data?.url) window.location.href = data.url as string;
};

/** Switch tier (Stripe only — Xendit users cancel + resubscribe). iOS routes to web account page. */
export const changeSubscription = async (new_tier_id: string) => {
  if (requiresExternalCheckout()) {
    await openOnWeb(`/account/billing?change=${new_tier_id}`);
    return { ok: true, redirected: true } as const;
  }
  const { data, error } = await supabase.functions.invoke("change-subscription", { body: { new_tier_id } });
  if (error) throw error;
  return data;
};

/** Cancel — auto routes based on stored provider. iOS routes to web. */
export const cancelSubscription = async (coach_id: string, provider: "stripe" | "xendit" = "stripe") => {
  if (requiresExternalCheckout()) {
    await openOnWeb(`/account/billing?cancel=${coach_id}`);
    return { ok: true, access_until: null } as const;
  }
  const fn = provider === "xendit" ? "cancel-xendit-subscription" : "cancel-subscription";
  const { data, error } = await supabase.functions.invoke(fn, { body: { coach_id } });
  if (error) throw error;
  return data as { ok: boolean; access_until: string | null };
};
