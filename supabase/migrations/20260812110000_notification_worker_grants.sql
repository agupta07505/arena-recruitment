-- Tables are created with explicit grants in this project. The server-only
-- notification worker needs only recipient lookup and delivery-state access.
grant select (id, email, full_name) on table public.profiles to service_role;
grant select (id, recipient_id, title, body, email_queued_at, email_sent_at, email_failed_at, email_error),
  update (email_sent_at, email_failed_at, email_error)
on table public.notifications to service_role;
