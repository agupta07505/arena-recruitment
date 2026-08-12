create or replace function private.notify_applicant_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  position_title text;
  notification_title text;
  notification_body text;
  notification_kind public.notification_kind;
begin
  if old.status is not distinct from new.status then return new; end if;

  select title into position_title from public.positions where id = new.position_id;

  case new.status
    when 'submitted' then
      notification_kind := 'submission';
      notification_title := 'Application received';
      notification_body := 'Your application for ' || position_title || ' is safely submitted.';
    when 'shortlisted' then
      notification_kind := 'shortlist';
      notification_title := 'You have been shortlisted';
      notification_body := 'Your ' || position_title || ' application has moved to the shortlist.';
    when 'interview_scheduled' then
      notification_kind := 'interview_change';
      notification_title := 'Interview scheduled';
      notification_body := 'Interview details are ready for your ' || position_title || ' application.';
    when 'waitlisted' then
      notification_kind := 'waitlist';
      notification_title := 'Application waitlisted';
      notification_body := 'Your ' || position_title || ' application remains under consideration.';
    when 'selected' then
      notification_kind := 'selection';
      notification_title := 'Welcome to the team';
      notification_body := 'You have been selected for ' || position_title || '.';
    when 'rejected' then
      notification_kind := 'rejection';
      notification_title := 'Application update';
      notification_body := 'A final decision is available for your ' || position_title || ' application.';
    when 'withdrawn' then
      notification_kind := 'announcement';
      notification_title := 'Application withdrawn';
      notification_body := 'Your ' || position_title || ' application has been withdrawn.';
    else
      return new;
  end case;

  insert into public.notifications (recipient_id, kind, title, body, payload, email_queued_at)
  values (
    new.applicant_id,
    notification_kind,
    notification_title,
    notification_body,
    jsonb_build_object('application_id', new.id, 'position_id', new.position_id, 'status', new.status),
    case when new.status in ('shortlisted', 'interview_scheduled', 'waitlisted', 'selected', 'rejected') then now() else null end
  );
  return new;
end;
$$;

create trigger applications_notify_applicant
after update of status on public.applications
for each row execute function private.notify_applicant_status();

revoke all on function private.notify_applicant_status() from public, anon, authenticated;
