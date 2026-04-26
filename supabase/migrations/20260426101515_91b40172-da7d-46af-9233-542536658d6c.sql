
-- =========================
-- ENUMS
-- =========================
create type public.app_role as enum ('admin', 'coach', 'mentee');
create type public.niche as enum ('Strength','Mindset','Endurance','Nutrition','Yoga','Business','Other');
create type public.media_type as enum ('text','image','video','pdf');
create type public.subscription_status as enum ('active','trialing','past_due','canceled','incomplete');
create type public.booking_status as enum ('pending','confirmed','completed','cancelled');

-- =========================
-- PROFILES
-- =========================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  display_name text not null,
  avatar_url text,
  headline text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- =========================
-- USER ROLES (separate table for security)
-- =========================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- =========================
-- COACH PROFILES
-- =========================
create table public.coach_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  niche public.niche not null default 'Other',
  rating numeric(3,2) not null default 5.00,
  subscriber_count int not null default 0,
  stripe_account_id text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.coach_profiles enable row level security;

-- =========================
-- SUBSCRIPTION TIERS
-- =========================
create table public.subscription_tiers (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  price_cents int not null check (price_cents >= 0),
  perks text[] not null default '{}',
  stripe_price_id text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.subscription_tiers enable row level security;
create index on public.subscription_tiers(coach_id);

-- =========================
-- SUBSCRIPTIONS
-- =========================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  tier_id uuid not null references public.subscription_tiers(id) on delete restrict,
  status public.subscription_status not null default 'incomplete',
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(mentee_id, coach_id)
);
alter table public.subscriptions enable row level security;
create index on public.subscriptions(coach_id);
create index on public.subscriptions(mentee_id);

create or replace function public.has_active_subscription(_mentee uuid, _coach uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.subscriptions
    where mentee_id = _mentee and coach_id = _coach
      and status in ('active','trialing')
  )
$$;

create or replace function public.has_active_subscription_to_tier(_mentee uuid, _tier uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.subscriptions
    where mentee_id = _mentee and tier_id = _tier
      and status in ('active','trialing')
  )
$$;

-- =========================
-- POSTS
-- =========================
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  media_type public.media_type not null default 'text',
  required_tier_id uuid references public.subscription_tiers(id) on delete set null,
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
create index on public.posts(coach_id, created_at desc);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  width int,
  height int,
  duration_sec int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.post_media enable row level security;

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.post_comments enable row level security;

-- =========================
-- CONVERSATIONS + MESSAGES
-- =========================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(mentee_id, coach_id)
);
alter table public.conversations enable row level security;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text,
  attachment_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create index on public.messages(conversation_id, created_at);

-- =========================
-- AVAILABILITY + BOOKINGS
-- =========================
create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_min int not null,
  price_cents int not null check (price_cents >= 0),
  is_booked boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.availability_slots enable row level security;
create index on public.availability_slots(coach_id, starts_at);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid unique references public.availability_slots(id) on delete set null,
  mentee_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  duration_min int not null,
  price_cents int not null,
  status public.booking_status not null default 'pending',
  stripe_payment_intent_id text,
  meeting_url text,
  created_at timestamptz not null default now()
);
alter table public.bookings enable row level security;

-- =========================
-- TRIGGERS
-- =========================
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
  -- ensure uniqueness
  while exists(select 1 from public.profiles where handle = v_handle) loop
    v_handle := v_handle || floor(random()*1000)::text;
  end loop;

  insert into public.profiles (id, handle, display_name)
  values (new.id, v_handle, coalesce(new.raw_user_meta_data->>'display_name', v_handle));

  insert into public.user_roles (user_id, role) values (new.id, 'mentee');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger coach_profiles_touch before update on public.coach_profiles
  for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- bump conversation last_message_at on new message
create or replace function public.bump_conversation()
returns trigger language plpgsql as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
create trigger messages_bump after insert on public.messages
  for each row execute function public.bump_conversation();

-- =========================
-- RLS POLICIES
-- =========================

-- profiles: public read, owner write
create policy "profiles readable by all" on public.profiles for select using (true);
create policy "owner can update profile" on public.profiles for update using (auth.uid() = id);
create policy "owner can insert profile" on public.profiles for insert with check (auth.uid() = id);

-- user_roles: user can read own, admin can manage
create policy "users see own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- coach_profiles: public read for published, owner write
create policy "published coaches readable" on public.coach_profiles for select using (is_published or auth.uid() = user_id);
create policy "coach manages own coach profile" on public.coach_profiles for insert with check (auth.uid() = user_id);
create policy "coach updates own coach profile" on public.coach_profiles for update using (auth.uid() = user_id);

-- subscription_tiers: public read of active tiers, coach manages
create policy "tiers readable" on public.subscription_tiers for select using (is_active or auth.uid() = coach_id);
create policy "coach manages tiers" on public.subscription_tiers for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

-- subscriptions: mentee + coach can see; only mentee inserts
create policy "subs visible to participants" on public.subscriptions for select using (auth.uid() = mentee_id or auth.uid() = coach_id);
create policy "mentee creates own sub" on public.subscriptions for insert with check (auth.uid() = mentee_id);
create policy "mentee updates own sub" on public.subscriptions for update using (auth.uid() = mentee_id);

-- posts:
--  - free posts visible to all
--  - locked posts visible to coach OR active subscriber to required tier
create policy "free posts visible" on public.posts for select
  using (
    required_tier_id is null
    or auth.uid() = coach_id
    or public.has_active_subscription_to_tier(auth.uid(), required_tier_id)
  );
create policy "coach manages own posts" on public.posts for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

-- post_media: visible if parent post visible
create policy "post media follows post" on public.post_media for select
  using (exists (
    select 1 from public.posts p where p.id = post_media.post_id
      and (p.required_tier_id is null
           or auth.uid() = p.coach_id
           or public.has_active_subscription_to_tier(auth.uid(), p.required_tier_id))
  ));
create policy "coach manages own post media" on public.post_media for all
  using (exists(select 1 from public.posts p where p.id = post_media.post_id and p.coach_id = auth.uid()))
  with check (exists(select 1 from public.posts p where p.id = post_media.post_id and p.coach_id = auth.uid()));

-- post_likes
create policy "likes readable" on public.post_likes for select using (true);
create policy "user manages own likes" on public.post_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- post_comments
create policy "comments readable" on public.post_comments for select using (true);
create policy "user posts own comments" on public.post_comments for insert with check (auth.uid() = user_id);
create policy "user edits own comments" on public.post_comments for update using (auth.uid() = user_id);
create policy "user deletes own comments" on public.post_comments for delete using (auth.uid() = user_id);

-- conversations: only the two participants; mentee must have active sub to start
create policy "conversation visible to participants" on public.conversations for select
  using (auth.uid() = mentee_id or auth.uid() = coach_id);
create policy "mentee creates conversation if subscribed" on public.conversations for insert
  with check (auth.uid() = mentee_id and public.has_active_subscription(mentee_id, coach_id));

-- messages: visible to participants, sender must be participant + mentee must still be subscribed
create policy "messages visible to participants" on public.messages for select
  using (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (auth.uid() = c.mentee_id or auth.uid() = c.coach_id)
  ));
create policy "participant sends message" on public.messages for insert with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (auth.uid() = c.mentee_id or auth.uid() = c.coach_id)
      and public.has_active_subscription(c.mentee_id, c.coach_id)
  )
);
create policy "participant marks own message read" on public.messages for update
  using (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (auth.uid() = c.mentee_id or auth.uid() = c.coach_id)
  ));

-- availability_slots: public read, coach manages
create policy "slots readable" on public.availability_slots for select using (true);
create policy "coach manages own slots" on public.availability_slots for all using (auth.uid() = coach_id) with check (auth.uid() = coach_id);

-- bookings: only mentee + coach
create policy "bookings visible to participants" on public.bookings for select
  using (auth.uid() = mentee_id or auth.uid() = coach_id);
create policy "mentee books" on public.bookings for insert with check (auth.uid() = mentee_id);
create policy "participant updates booking" on public.bookings for update
  using (auth.uid() = mentee_id or auth.uid() = coach_id);

-- =========================
-- STORAGE
-- =========================
insert into storage.buckets (id, name, public) values ('avatars','avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('post-media','post-media', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('message-attachments','message-attachments', false) on conflict do nothing;

-- avatars: public read, user writes own folder (folder = user id)
create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars owner write" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars owner update" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars owner delete" on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- post-media: coach uploads to own folder; reads happen via signed URLs from edge function
create policy "post-media coach write" on storage.objects for insert
  with check (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "post-media coach update" on storage.objects for update
  using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "post-media coach delete" on storage.objects for delete
  using (bucket_id = 'post-media' and auth.uid()::text = (storage.foldername(name))[1]);

-- message-attachments: sender uploads to own folder
create policy "message-attachments sender write" on storage.objects for insert
  with check (bucket_id = 'message-attachments' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "message-attachments owner read" on storage.objects for select
  using (bucket_id = 'message-attachments' and auth.uid()::text = (storage.foldername(name))[1]);

-- realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
