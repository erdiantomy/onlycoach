create table if not exists public.processed_webhook_events (
  id text primary key,
  provider text not null,
  event_type text,
  processed_at timestamptz not null default now()
);

alter table public.processed_webhook_events enable row level security;
-- No policies = service role only. Webhook handlers use service role.

create index if not exists idx_processed_webhook_events_provider on public.processed_webhook_events(provider, processed_at desc);