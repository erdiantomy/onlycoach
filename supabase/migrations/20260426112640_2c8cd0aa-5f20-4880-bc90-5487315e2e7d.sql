do $$ begin
  create type payment_provider as enum ('stripe','xendit');
exception when duplicate_object then null; end $$;

alter table public.bookings
  add column if not exists payment_provider payment_provider not null default 'stripe',
  add column if not exists xendit_invoice_id text;

alter table public.subscriptions
  add column if not exists payment_provider payment_provider not null default 'stripe',
  add column if not exists xendit_recurring_plan_id text,
  add column if not exists xendit_customer_id text;

alter table public.subscription_tiers
  add column if not exists xendit_plan_id text,
  add column if not exists price_idr_cents integer;

create index if not exists idx_subscriptions_xendit_plan on public.subscriptions(xendit_recurring_plan_id);
create index if not exists idx_bookings_xendit_invoice on public.bookings(xendit_invoice_id);