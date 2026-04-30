-- challenge_enrollments: rename user_id -> mentee_id
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='challenge_enrollments' and column_name='user_id')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='challenge_enrollments' and column_name='mentee_id') then
    alter table public.challenge_enrollments rename column user_id to mentee_id;
  end if;
end $$;

-- Refresh policies that referenced user_id
drop policy if exists "user reads own enrollments" on public.challenge_enrollments;
drop policy if exists "user enrolls self" on public.challenge_enrollments;
drop policy if exists "user unenrolls self" on public.challenge_enrollments;
create policy "mentee reads own enrollments" on public.challenge_enrollments for select using (auth.uid() = mentee_id);
create policy "mentee enrolls self" on public.challenge_enrollments for insert with check (auth.uid() = mentee_id);
create policy "mentee unenrolls self" on public.challenge_enrollments for delete using (auth.uid() = mentee_id);

-- challenge_curriculum: add sort_order
alter table public.challenge_curriculum add column if not exists sort_order integer not null default 0;

-- challenge_status enum: add 'completed'
do $$ begin
  if not exists (select 1 from pg_enum e join pg_type t on e.enumtypid = t.oid where t.typname='challenge_status' and e.enumlabel='completed') then
    alter type public.challenge_status add value 'completed';
  end if;
end $$;

-- community_posts: make author_id nullable (we use user_id)
alter table public.community_posts alter column author_id drop not null;

-- coach_payout_accounts: extra columns used by Payouts page
alter table public.coach_payout_accounts add column if not exists bank_account_number text;
alter table public.coach_payout_accounts add column if not exists bank_account_holder text;
alter table public.coach_payout_accounts add column if not exists payout_schedule text not null default 'monthly';

-- subscriber_notes: add `note` + unique key
alter table public.subscriber_notes add column if not exists note text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='subscriber_notes_coach_mentee_key') then
    alter table public.subscriber_notes add constraint subscriber_notes_coach_mentee_key unique (coach_id, mentee_id);
  end if;
end $$;

-- payouts: add created_at
alter table public.payouts add column if not exists created_at timestamptz not null default now();

-- profile_views: add referrer
alter table public.profile_views add column if not exists referrer text;

-- badges
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  badge_type text not null,
  label text not null,
  icon text,
  earned_at timestamptz not null default now()
);
alter table public.badges enable row level security;
create policy "badges public read" on public.badges for select using (true);
create policy "admin reads badges" on public.badges for select using (public.has_role(auth.uid(), 'admin'));