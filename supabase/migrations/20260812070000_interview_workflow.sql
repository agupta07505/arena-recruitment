create or replace function private.enforce_interview_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  slot_capacity integer;
  active_bookings integer;
begin
  if new.status not in ('pending', 'confirmed') then return new; end if;
  select capacity into slot_capacity from public.interview_slots where id = new.slot_id and not is_cancelled for update;
  if slot_capacity is null then raise exception 'Interview slot is unavailable'; end if;
  select count(*) into active_bookings from public.interview_bookings
  where slot_id = new.slot_id and status in ('pending', 'confirmed') and id is distinct from new.id;
  if active_bookings >= slot_capacity then raise exception 'Interview slot is full'; end if;
  return new;
end;
$$;

drop trigger if exists interview_bookings_capacity_guard on public.interview_bookings;
create trigger interview_bookings_capacity_guard
before insert or update of slot_id, status on public.interview_bookings
for each row execute function private.enforce_interview_capacity();

create or replace function private.notify_interview_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  role_title text;
  starts_at_value timestamptz;
  message_title text;
  message_body text;
begin
  select a.applicant_id, p.title into recipient, role_title
  from public.applications a join public.positions p on p.id = a.position_id
  where a.id = new.application_id;
  select starts_at into starts_at_value from public.interview_slots where id = new.slot_id;

  if tg_op = 'INSERT' or new.slot_id is distinct from old.slot_id then
    message_title := case when tg_op = 'INSERT' then 'Interview slot assigned' else 'Interview rescheduled' end;
    message_body := role_title || ' · ' || to_char(starts_at_value at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM') || ' IST. Please confirm or decline.';
  elsif new.status = 'confirmed' and old.status is distinct from new.status then
    message_title := 'Interview confirmed'; message_body := 'Your interview for ' || role_title || ' is confirmed.';
  elsif new.status = 'declined' and old.status is distinct from new.status then
    message_title := 'Interview declined'; message_body := 'You declined the assigned interview for ' || role_title || '. The team may contact you with alternatives.';
  elsif new.status = 'cancelled' and old.status is distinct from new.status then
    message_title := 'Interview cancelled'; message_body := 'The assigned interview for ' || role_title || ' has been cancelled. A replacement may follow.';
  else return new;
  end if;

  insert into public.notifications (recipient_id, kind, title, body, payload, email_queued_at)
  values (recipient, 'interview_change', message_title, message_body,
    jsonb_build_object('application_id', new.application_id, 'booking_id', new.id, 'slot_id', new.slot_id, 'status', new.status), now());
  return new;
end;
$$;

drop trigger if exists interview_bookings_notify on public.interview_bookings;
create trigger interview_bookings_notify
after insert or update of slot_id, status on public.interview_bookings
for each row execute function private.notify_interview_change();

revoke all on function private.enforce_interview_capacity() from public, anon, authenticated;
revoke all on function private.notify_interview_change() from public, anon, authenticated;
