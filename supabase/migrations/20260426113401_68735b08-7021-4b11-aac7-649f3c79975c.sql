create unique index if not exists uq_bookings_xendit_invoice
  on public.bookings(xendit_invoice_id)
  where xendit_invoice_id is not null;

create unique index if not exists uq_subscriptions_xendit_plan
  on public.subscriptions(xendit_recurring_plan_id)
  where xendit_recurring_plan_id is not null;