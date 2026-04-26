
-- 1. Idempotency: one subscription per (mentee, coach) — required for upsert onConflict.
--    Allow multiple historical rows by only enforcing on non-canceled rows.
CREATE UNIQUE INDEX IF NOT EXISTS ux_subscriptions_mentee_coach_active
  ON public.subscriptions (mentee_id, coach_id)
  WHERE status <> 'canceled';

-- 2. One row per Stripe subscription id (for webhook lookups).
CREATE UNIQUE INDEX IF NOT EXISTS ux_subscriptions_stripe_id
  ON public.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- 3. One row per Xendit recurring plan (referenced by xendit-webhook).
CREATE UNIQUE INDEX IF NOT EXISTS ux_subscriptions_xendit_plan
  ON public.subscriptions (xendit_recurring_plan_id)
  WHERE xendit_recurring_plan_id IS NOT NULL;

-- 4. Idempotent bookings — one per Stripe payment intent / Xendit invoice.
CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_stripe_pi
  ON public.bookings (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_xendit_invoice
  ON public.bookings (xendit_invoice_id)
  WHERE xendit_invoice_id IS NOT NULL;

-- 5. Honor "keep access until period end" — canceled subs inside their paid
--    window must still pass has_active_subscription so chat + gated posts work.
CREATE OR REPLACE FUNCTION public.has_active_subscription(_mentee uuid, _coach uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE mentee_id = _mentee
      AND coach_id  = _coach
      AND (
        status IN ('active','trialing')
        OR (
          status = 'canceled'
          AND current_period_end IS NOT NULL
          AND current_period_end > now()
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.has_active_subscription_to_tier(_mentee uuid, _tier uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE mentee_id = _mentee
      AND tier_id   = _tier
      AND (
        status IN ('active','trialing')
        OR (
          status = 'canceled'
          AND current_period_end IS NOT NULL
          AND current_period_end > now()
        )
      )
  )
$$;
