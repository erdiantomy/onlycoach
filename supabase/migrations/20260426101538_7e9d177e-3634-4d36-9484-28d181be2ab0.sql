
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin new.updated_at := now(); return new; end;
$$;

create or replace function public.bump_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

-- Replace overly broad avatar SELECT with a narrower one that still allows
-- direct file fetches via public URL but blocks listing the bucket contents.
drop policy if exists "avatars public read" on storage.objects;
-- Public URLs hit the storage edge (not this policy), so we keep listing private:
create policy "avatars owner can list" on storage.objects for select
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
