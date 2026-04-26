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
