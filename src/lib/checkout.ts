import { supabase } from "@/integrations/supabase/client";

/** Opens Stripe checkout for a coach subscription tier. */
export const startSubscriptionCheckout = async (tier_id: string) => {
  const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
    body: { tier_id },
  });
  if (error) throw error;
  if (data?.url) window.location.href = data.url as string;
};

/** Opens Stripe checkout for a single booking slot. */
export const startBookingCheckout = async (slot_id: string) => {
  const { data, error } = await supabase.functions.invoke("create-booking-checkout", {
    body: { slot_id },
  });
  if (error) throw error;
  if (data?.url) window.location.href = data.url as string;
};

/** Switch an existing subscription to a different tier (immediate + prorated). */
export const changeSubscription = async (new_tier_id: string) => {
  const { data, error } = await supabase.functions.invoke("change-subscription", {
    body: { new_tier_id },
  });
  if (error) throw error;
  return data;
};

/** Cancel a subscription at the end of the current billing period. */
export const cancelSubscription = async (coach_id: string) => {
  const { data, error } = await supabase.functions.invoke("cancel-subscription", {
    body: { coach_id },
  });
  if (error) throw error;
  return data as { ok: boolean; access_until: string | null };
};
