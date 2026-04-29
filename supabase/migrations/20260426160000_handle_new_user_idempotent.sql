-- ===================================================================
-- Idempotent + OAuth-aware handle_new_user trigger.
--
-- The original trigger (in 20260426101515_…sql) creates a profile row
-- on auth.users insert. Two production-issue gaps:
--
--   1. If the trigger ever runs twice for the same user (or you have
--      to backfill manually) the unique handle generation can throw
--      because the inner loop only retries on `profiles.handle`
--      collisions, not on `profiles.id` collisions.
--   2. OAuth signups (Google, Apple) don't supply
--      `raw_user_meta_data.handle` or `display_name`. We fall back to
--      the email local-part, which is fine, but we also want to read
--      the canonical `name` / `full_name` / `email` fields the
--      provider does set.
--
-- This migration replaces the function with one that:
--   - resolves a display name from name/full_name/display_name/email
--   - generates a handle that's URL-safe and unique
--   - is idempotent: ON CONFLICT (id) DO NOTHING on the profile insert
--   - skips the duplicate user_roles insert if one already exists
-- ===================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
  v_display text;
begin
  -- Pick the best display name we can get: explicit > full_name > name > email local-part
  v_display := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, ''), '@', 1),
    'user'
  );

  -- Build a handle from raw_user_meta_data.handle, the email local-part,
  -- or the display name. Strip everything that isn't a-z, 0-9, _.
  v_handle := lower(
    regexp_replace(
      coalesce(
        new.raw_user_meta_data->>'handle',
        split_part(coalesce(new.email, ''), '@', 1),
        v_display
      ),
      '[^a-z0-9_]',
      '',
      'g'
    )
  );
  if v_handle is null or v_handle = '' then
    v_handle := 'user';
  end if;

  -- Ensure handle uniqueness with a random suffix loop (cheap; collisions rare).
  while exists (select 1 from public.profiles where handle = v_handle) loop
    v_handle := v_handle || floor(random() * 10000)::text;
  end loop;

  -- Idempotent profile insert.
  insert into public.profiles (id, handle, display_name)
  values (new.id, v_handle, v_display)
  on conflict (id) do nothing;

  -- Idempotent default role.
  insert into public.user_roles (user_id, role)
  values (new.id, 'mentee')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

-- Trigger drop+create so we know the new function body is bound.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
