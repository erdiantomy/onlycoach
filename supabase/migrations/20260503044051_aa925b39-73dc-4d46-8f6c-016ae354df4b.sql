-- 1. Backfill price_idr_cents
update public.subscription_tiers
  set price_idr_cents = price_cents
  where price_idr_cents is null;

-- 2. Revenue ledger
create table if not exists public.revenue_events (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null,
  mentee_id uuid,
  source text not null check (source in ('subscription','booking')),
  source_ref_id uuid,
  gross_idr_cents bigint not null,
  platform_fee_idr_cents bigint not null,
  coach_net_idr_cents bigint not null,
  payment_provider text not null default 'xendit',
  external_ref text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (payment_provider, external_ref)
);

create index if not exists idx_revenue_events_coach on public.revenue_events(coach_id, occurred_at desc);

alter table public.revenue_events enable row level security;

create policy "coach reads own revenue"
  on public.revenue_events for select
  using (auth.uid() = coach_id);

create policy "admin reads all revenue"
  on public.revenue_events for select
  using (has_role(auth.uid(), 'admin'::app_role));

-- 3. Payout columns
alter table public.payouts
  add column if not exists xendit_disbursement_id text unique,
  add column if not exists failure_reason text;

-- 4. Balance view
create or replace view public.coach_balances as
select
  c.user_id as coach_id,
  coalesce((select sum(coach_net_idr_cents) from public.revenue_events r where r.coach_id = c.user_id), 0)
    -
  coalesce((select sum(amount_cents) from public.payouts p where p.coach_id = c.user_id and p.status in ('pending','processing','paid')), 0)
    as available_idr_cents,
  coalesce((select sum(coach_net_idr_cents) from public.revenue_events r where r.coach_id = c.user_id), 0) as lifetime_idr_cents,
  coalesce((select sum(amount_cents) from public.payouts p where p.coach_id = c.user_id and p.status = 'paid'), 0) as paid_idr_cents
from public.coach_profiles c;

grant select on public.coach_balances to authenticated;

-- 5. Min payout helper
create or replace function public.min_payout_idr_cents()
  returns bigint language sql immutable as $$ select 25000000::bigint $$;