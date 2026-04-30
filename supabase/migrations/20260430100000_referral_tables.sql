-- Referral codes: one per coach (auto-created on first visit)
create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  code text unique not null,
  created_at timestamptz not null default now()
);

-- Referral signups: tracks who signed up via a referral link
create table public.referral_signups (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(referral_code_id, referred_user_id)
);

alter table public.referral_codes enable row level security;
alter table public.referral_signups enable row level security;

create policy "coach sees own codes" on public.referral_codes
  for select using (auth.uid() = coach_id);

create policy "coach creates own codes" on public.referral_codes
  for insert with check (auth.uid() = coach_id);

create policy "coach sees own referral signups" on public.referral_signups
  for select using (
    exists(
      select 1 from public.referral_codes rc
      where rc.id = referral_code_id and rc.coach_id = auth.uid()
    )
  );
