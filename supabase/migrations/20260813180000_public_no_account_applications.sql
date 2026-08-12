alter table public.applications
  alter column applicant_id drop not null,
  add column applicant_name text,
  add column applicant_scholar_id text,
  add column applicant_degree text,
  add column applicant_branch text,
  add column applicant_year text,
  add column applicant_gender text,
  add column applicant_phone text,
  add column applicant_email extensions.citext,
  add column relevant_experience text,
  add column work_links text[] not null default '{}';

alter table public.applications
  add constraint applications_guest_degree_check
    check (applicant_degree is null or applicant_degree in ('B.Tech', 'MCA', 'M.Tech', 'Ph.D')),
  add constraint applications_guest_gender_check
    check (applicant_gender is null or applicant_gender in ('Male', 'Female', 'Third gender'));

create unique index applications_guest_email_position_unique
  on public.applications (campaign_id, lower(applicant_email::text), position_id)
  where applicant_id is null and applicant_email is not null;

create index applications_guest_degree_idx on public.applications(applicant_degree)
  where applicant_id is null;
create index applications_guest_year_idx on public.applications(applicant_year)
  where applicant_id is null;

insert into public.positions (
  id, campaign_id, slug, title, division, summary, capacity, eligible_years, sort_order, is_active
)
values (
  '20000000-0000-4000-8000-000000000009',
  '10000000-0000-4000-8000-000000000001',
  'volunteer-coordinator',
  'Volunteer Coordinator',
  'operations',
  'Bring volunteers together, communicate clearly, and keep every crew supported and on time.',
  1,
  array[1,2,3,4]::smallint[],
  90,
  true
)
on conflict (campaign_id, slug) do update set
  title = excluded.title,
  division = excluded.division,
  summary = excluded.summary,
  sort_order = excluded.sort_order,
  is_active = true;

create or replace function private.application_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  actor_is_admin boolean := private.has_staff_role(array['admin']::public.staff_role[])
    or coalesce((select auth.role()) = 'service_role', false);
  applicant public.profiles;
  target_position public.positions;
  target_campaign public.campaigns;
  required_missing boolean;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not actor_is_admin then
      if actor is distinct from old.applicant_id then
        raise exception 'Only the applicant or an admin can change application status';
      end if;
      if not (
        (old.status = 'draft' and new.status = 'submitted')
        or (old.status in ('submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'interviewed', 'waitlisted') and new.status = 'withdrawn')
      ) then
        raise exception 'Invalid applicant status transition: % to %', old.status, new.status;
      end if;
    end if;
  end if;

  if tg_op = 'UPDATE' and not actor_is_admin and old.status <> 'draft' then
    if new.campaign_id is distinct from old.campaign_id
      or new.position_id is distinct from old.position_id
      or new.applicant_id is distinct from old.applicant_id
      or new.submitted_at is distinct from old.submitted_at
      or new.reopened_at is distinct from old.reopened_at then
      raise exception 'Submitted applications are locked';
    end if;
  end if;

  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    select * into target_position from public.positions where id = new.position_id;
    select * into target_campaign from public.campaigns where id = new.campaign_id;

    if target_position.campaign_id <> new.campaign_id or not target_position.is_active then
      raise exception 'Position is not active in this campaign';
    end if;
    if target_campaign.status <> 'open' or not target_campaign.is_published
      or target_campaign.opens_at is null or target_campaign.closes_at is null
      or now() not between target_campaign.opens_at and target_campaign.closes_at then
      raise exception 'Recruitment campaign is not accepting submissions';
    end if;

    if new.applicant_id is null then
      if nullif(trim(new.applicant_name), '') is null
        or nullif(trim(new.applicant_scholar_id), '') is null
        or nullif(trim(new.applicant_degree), '') is null
        or nullif(trim(new.applicant_branch), '') is null
        or nullif(trim(new.applicant_year), '') is null
        or nullif(trim(new.applicant_gender), '') is null
        or nullif(trim(new.applicant_phone), '') is null
        or new.applicant_email is null
        or nullif(trim(new.relevant_experience), '') is null then
        raise exception 'Applicant details are incomplete';
      end if;
    else
      select * into applicant from public.profiles where id = new.applicant_id;
      if applicant.full_name is null or applicant.scholar_id is null or applicant.phone is null
        or applicant.branch is null or applicant.academic_year is null or applicant.gender is null
        or applicant.availability is null or applicant.recruitment_consent_at is null
        or applicant.reporting_consent_at is null or applicant.staff_access_consent_at is null then
        raise exception 'Applicant profile is incomplete';
      end if;
      if not applicant.academic_year = any(target_position.eligible_years) then
        raise exception 'Applicant is not eligible for this position';
      end if;
      select exists (
        select 1 from public.position_questions q
        where q.position_id = new.position_id and q.is_required
          and not exists (
            select 1 from public.application_answers aa
            where aa.application_id = new.id and aa.question_id = q.id
          )
      ) into required_missing;
      if required_missing then raise exception 'Required application answers are missing'; end if;
    end if;

    new.submitted_at = coalesce(new.submitted_at, now());
    new.withdrawn_at = null;
  elsif new.status = 'withdrawn' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.withdrawn_at = now();
  elsif tg_op = 'UPDATE' and actor_is_admin and new.status = 'draft' and old.status <> 'draft' then
    new.reopened_at = now();
  end if;

  return new;
end;
$$;

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
  if new.applicant_id is null or old.status is not distinct from new.status then return new; end if;
  select title into position_title from public.positions where id = new.position_id;
  case new.status
    when 'submitted' then notification_kind := 'submission'; notification_title := 'Application received'; notification_body := 'Your application for ' || position_title || ' is safely submitted.';
    when 'shortlisted' then notification_kind := 'shortlist'; notification_title := 'You have been shortlisted'; notification_body := 'Your ' || position_title || ' application has moved to the shortlist.';
    when 'interview_scheduled' then notification_kind := 'interview_change'; notification_title := 'Interview scheduled'; notification_body := 'Interview details are ready for your ' || position_title || ' application.';
    when 'waitlisted' then notification_kind := 'waitlist'; notification_title := 'Application waitlisted'; notification_body := 'Your ' || position_title || ' application remains under consideration.';
    when 'selected' then notification_kind := 'selection'; notification_title := 'Welcome to the team'; notification_body := 'You have been selected for ' || position_title || '.';
    when 'rejected' then notification_kind := 'rejection'; notification_title := 'Application update'; notification_body := 'A final decision is available for your ' || position_title || ' application.';
    when 'withdrawn' then notification_kind := 'announcement'; notification_title := 'Application withdrawn'; notification_body := 'Your ' || position_title || ' application has been withdrawn.';
    else return new;
  end case;
  insert into public.notifications (recipient_id, kind, title, body, payload, email_queued_at)
  values (new.applicant_id, notification_kind, notification_title, notification_body,
    jsonb_build_object('application_id', new.id, 'position_id', new.position_id, 'status', new.status),
    case when new.status in ('shortlisted', 'interview_scheduled', 'waitlisted', 'selected', 'rejected') then now() else null end);
  return new;
end;
$$;

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
  if recipient is null then return new; end if;
  select starts_at into starts_at_value from public.interview_slots where id = new.slot_id;
  if tg_op = 'INSERT' or new.slot_id is distinct from old.slot_id then
    message_title := case when tg_op = 'INSERT' then 'Interview slot assigned' else 'Interview rescheduled' end;
    message_body := role_title || ' · ' || to_char(starts_at_value at time zone 'Asia/Kolkata', 'DD Mon YYYY, HH12:MI AM') || ' IST. Please confirm or decline.';
  elsif new.status = 'confirmed' and old.status is distinct from new.status then message_title := 'Interview confirmed'; message_body := 'Your interview for ' || role_title || ' is confirmed.';
  elsif new.status = 'declined' and old.status is distinct from new.status then message_title := 'Interview declined'; message_body := 'You declined the assigned interview for ' || role_title || '.';
  elsif new.status = 'cancelled' and old.status is distinct from new.status then message_title := 'Interview cancelled'; message_body := 'The assigned interview for ' || role_title || ' has been cancelled.';
  else return new;
  end if;
  insert into public.notifications (recipient_id, kind, title, body, payload, email_queued_at)
  values (recipient, 'interview_change', message_title, message_body,
    jsonb_build_object('application_id', new.application_id, 'booking_id', new.id, 'slot_id', new.slot_id, 'status', new.status), now());
  return new;
end;
$$;
