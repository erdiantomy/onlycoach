create policy "no client access" on public.processed_webhook_events
  for all to authenticated, anon
  using (false) with check (false);