-- =========================================================
-- Public Profiles: mentee_profiles, follows, badges, profile_views
-- =========================================================

-- ---- MENTEE PROFILES ----
create table if not exists public.mentee_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  interests text[] not null default '{}',
  is_public boolean not null default true,
  show_subscriptions boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.mentee_profiles enable row level security;

create policy "public mentee profiles readable" on public.mentee_profiles
  for select using (is_public or auth.uid() = user_id);
create policy "owner manages mentee profile" on public.mentee_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists mentee_profiles_touch on public.mentee_profiles;
create trigger mentee_profiles_touch before update on public.mentee_profiles
  for each row execute function public.touch_updated_at();

-- ---- FOLLOWS ----
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);
alter table public.follows enable row level security;
create index if not exists follows_following_idx on public.follows(following_id);
create index if not exists follows_follower_idx on public.follows(follower_id);

create policy "follows readable" on public.follows for select using (true);
create policy "user manages own follows" on public.follows
  for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

-- ---- BADGES ----
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_type text not null,
  label text not null,
  icon text not null default '🏆',
  metadata jsonb default '{}',
  earned_at timestamptz not null default now()
);
alter table public.badges enable row level security;
create index if not exists badges_user_idx on public.badges(user_id);

create policy "badges readable" on public.badges for select using (true);
create policy "system inserts badges" on public.badges for insert
  with check (auth.uid() = user_id);

-- ---- PROFILE VIEWS ----
create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  viewer_id uuid references auth.users(id) on delete set null,
  referrer text,
  created_at timestamptz not null default now()
);
alter table public.profile_views enable row level security;
create index if not exists profile_views_profile_idx on public.profile_views(profile_id, created_at desc);

create policy "owner sees own views" on public.profile_views
  for select using (auth.uid() = profile_id);
create policy "anyone records view" on public.profile_views
  for insert with check (true);

-- ---- FOLLOWER COUNT ON PROFILES ----
alter table public.profiles add column if not exists follower_count int not null default 0;

-- ---- FOLLOWER COUNT SYNC TRIGGER ----
create or replace function public.sync_follower_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set follower_count = follower_count + 1 where id = NEW.following_id;
  elsif TG_OP = 'DELETE' then
    update profiles set follower_count = greatest(0, follower_count - 1) where id = OLD.following_id;
  end if;
  return null;
end;
$$;

drop trigger if exists follows_sync on public.follows;
create trigger follows_sync after insert or delete on public.follows
  for each row execute function public.sync_follower_count();

-- ---- UPDATE handle_new_user TO CREATE MENTEE PROFILE ----
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
begin
  v_handle := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'handle', split_part(new.email,'@',1)), '[^a-z0-9_]', '', 'g'));
  if v_handle = '' or v_handle is null then v_handle := 'user'; end if;
  while exists(select 1 from public.profiles where handle = v_handle) loop
    v_handle := v_handle || floor(random()*1000)::text;
  end loop;

  insert into public.profiles (id, handle, display_name)
  values (new.id, v_handle, coalesce(new.raw_user_meta_data->>'display_name', v_handle));

  insert into public.user_roles (user_id, role) values (new.id, 'mentee');

  insert into public.mentee_profiles (user_id) values (new.id);

  return new;
end;
$$;

-- Backfill mentee_profiles for existing users who don't have one yet
insert into public.mentee_profiles (user_id)
select id from auth.users
where id not in (select user_id from public.mentee_profiles)
on conflict (user_id) do nothing;

-- ---- REALTIME ----
do $$ begin
  perform 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'follows';
  if not found then
    alter publication supabase_realtime add table public.follows;
  end if;
end $$;
