import { supabase } from "@/integrations/supabase/client";

/** Detect if user should be routed to Xendit (SEA locales). */
export const shouldUseXendit = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const langs = [navigator.language, ...(navigator.languages ?? [])].map((l) => l.toLowerCase());
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  const seaTz = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Manila", "Asia/Kuala_Lumpur", "Asia/Singapore", "Asia/Bangkok", "Asia/Ho_Chi_Minh"];
  const seaLocaleMatch = langs.some((l) => /-(id|ph|my|sg|th|vn)\b/.test(l) || l.startsWith("id") || l.startsWith("tl"));
  return seaLocaleMatch || seaTz.includes(tz);
};

/** Subscribe — auto routes Stripe vs Xendit. */
export const startSubscriptionCheckout = async (tier_id: string) => {
  const fn = shouldUseXendit() ? "create-xendit-subscription" : "create-subscription-checkout";
  const { data, error } = await supabase.functions.invoke(fn, { body: { tier_id } });
  if (error) throw error;
  if (data?.url) window.location.href = data.url as string;
};

/** Book — auto routes Stripe vs Xendit. */
export const startBookingCheckout = async (slot_id: string) => {
  const fn = shouldUseXendit() ? "create-xendit-invoice" : "create-booking-checkout";
  const { data, error } = await supabase.functions.invoke(fn, { body: { slot_id } });
  if (error) throw error;
  if (data?.url) window.location.href = data.url as string;
};

/** Switch tier (Stripe only — Xendit users cancel + resubscribe). */
export const changeSubscription = async (new_tier_id: string) => {
  const { data, error } = await supabase.functions.invoke("change-subscription", { body: { new_tier_id } });
  if (error) throw error;
  return data;
};

/** Cancel — auto routes based on stored provider. */
export const cancelSubscription = async (coach_id: string, provider: "stripe" | "xendit" = "stripe") => {
  const fn = provider === "xendit" ? "cancel-xendit-subscription" : "cancel-subscription";
  const { data, error } = await supabase.functions.invoke(fn, { body: { coach_id } });
  if (error) throw error;
  return data as { ok: boolean; access_until: string | null };
};
