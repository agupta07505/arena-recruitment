create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.gender_value as enum ('Man', 'Woman');
create type public.staff_role as enum ('admin', 'reviewer', 'interviewer', 'observer');
create type public.campaign_status as enum ('draft', 'open', 'closed', 'archived');
create type public.application_status as enum (
  'draft',
  'submitted',
  'under_review',
  'shortlisted',
  'interview_scheduled',
  'interviewed',
  'selected',
  'waitlisted',
  'rejected',
  'withdrawn'
);
create type public.question_kind as enum ('short_text', 'long_text', 'url', 'boolean', 'single_choice');
create type public.review_recommendation as enum ('strong_yes', 'yes', 'maybe', 'no', 'strong_no');
create type public.booking_status as enum ('pending', 'confirmed', 'declined', 'cancelled');
create type public.notification_kind as enum (
  'submission',
  'shortlist',
  'interview_change',
  'waitlist',
  'selection',
  'rejection',
  'announcement'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  scholar_id text unique,
  email extensions.citext not null,
  phone text,
  branch text,
  academic_year smallint check (academic_year between 1 and 5),
  gender public.gender_value,
  availability text,
  experience text,
  motivation text,
  work_links text[] not null default '{}',
  recruitment_consent_at timestamptz,
  reporting_consent_at timestamptz,
  staff_access_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_unique on public.profiles (lower(email::text));

create table public.staff_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.staff_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  description text,
  status public.campaign_status not null default 'draft',
  opens_at timestamptz,
  closes_at timestamptz,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (opens_at is null or closes_at is null or opens_at < closes_at)
);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  division text not null check (division in ('operations', 'esports', 'creative', 'technology')),
  summary text not null,
  capacity smallint not null check (capacity > 0),
  eligible_years smallint[] not null,
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, slug),
  check (cardinality(eligible_years) > 0),
  check (eligible_years <@ array[1, 2, 3, 4, 5]::smallint[])
);

create index positions_campaign_id_idx on public.positions(campaign_id);

create table public.position_questions (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.positions(id) on delete cascade,
  prompt text not null,
  help_text text,
  kind public.question_kind not null default 'long_text',
  is_required boolean not null default true,
  options jsonb,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (position_id, sort_order),
  check (options is null or jsonb_typeof(options) = 'array')
);

create index position_questions_position_id_idx on public.position_questions(position_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  position_id uuid not null references public.positions(id) on delete restrict,
  applicant_id uuid not null references public.profiles(id) on delete restrict,
  status public.application_status not null default 'draft',
  submitted_at timestamptz,
  withdrawn_at timestamptz,
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, applicant_id, position_id)
);

create index applications_applicant_id_idx on public.applications(applicant_id);
create index applications_campaign_status_idx on public.applications(campaign_id, status);
create index applications_position_status_idx on public.applications(position_id, status);
create index applications_submitted_at_idx on public.applications(submitted_at desc) where submitted_at is not null;

create table public.application_answers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  question_id uuid not null references public.position_questions(id) on delete restrict,
  answer_text text,
  answer_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, question_id),
  check (answer_text is not null or answer_json is not null)
);

create index application_answers_application_id_idx on public.application_answers(application_id);

create table public.review_assignments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  due_at timestamptz,
  completed_at timestamptz,
  unique (application_id, reviewer_id)
);

create index review_assignments_reviewer_id_idx on public.review_assignments(reviewer_id);
create index review_assignments_application_id_idx on public.review_assignments(application_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.review_assignments(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  motivation_score smallint not null check (motivation_score between 1 and 5),
  experience_score smallint not null check (experience_score between 1 and 5),
  role_fit_score smallint not null check (role_fit_score between 1 and 5),
  communication_score smallint not null check (communication_score between 1 and 5),
  availability_score smallint not null check (availability_score between 1 and 5),
  recommendation public.review_recommendation not null,
  private_comments text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_reviewer_id_idx on public.reviews(reviewer_id);

create table public.interview_slots (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  position_id uuid references public.positions(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text,
  meeting_url text,
  capacity smallint not null default 1 check (capacity > 0),
  interviewer_ids uuid[] not null default '{}',
  is_cancelled boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  check (venue is not null or meeting_url is not null)
);

create index interview_slots_campaign_starts_idx on public.interview_slots(campaign_id, starts_at);

create table public.interview_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.interview_slots(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  status public.booking_status not null default 'pending',
  applicant_responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slot_id, application_id)
);

create unique index interview_bookings_active_application_idx
  on public.interview_bookings(application_id)
  where status in ('pending', 'confirmed');
create index interview_bookings_slot_id_idx on public.interview_bookings(slot_id);

create table public.interview_feedback (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.interview_bookings(id) on delete cascade,
  interviewer_id uuid not null references auth.users(id) on delete restrict,
  attended boolean not null,
  feedback text,
  recommendation public.review_recommendation,
  final_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, interviewer_id)
);

create index interview_feedback_booking_id_idx on public.interview_feedback(booking_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  email_queued_at timestamptz,
  email_sent_at timestamptz,
  email_failed_at timestamptz,
  email_error text,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(payload) = 'object')
);

create index notifications_recipient_created_idx on public.notifications(recipient_id, created_at desc);
create index notifications_email_queue_idx on public.notifications(email_queued_at, email_sent_at) where email_queued_at is not null;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger campaigns_set_updated_at before update on public.campaigns
for each row execute function private.set_updated_at();
create trigger positions_set_updated_at before update on public.positions
for each row execute function private.set_updated_at();
create trigger position_questions_set_updated_at before update on public.position_questions
for each row execute function private.set_updated_at();
create trigger applications_set_updated_at before update on public.applications
for each row execute function private.set_updated_at();
create trigger application_answers_set_updated_at before update on public.application_answers
for each row execute function private.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews
for each row execute function private.set_updated_at();
create trigger interview_slots_set_updated_at before update on public.interview_slots
for each row execute function private.set_updated_at();
create trigger interview_bookings_set_updated_at before update on public.interview_bookings
for each row execute function private.set_updated_at();
create trigger interview_feedback_set_updated_at before update on public.interview_feedback
for each row execute function private.set_updated_at();

create or replace function private.normalize_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email = lower(trim(new.email::text));
  if new.scholar_id is not null then
    new.scholar_id = upper(regexp_replace(trim(new.scholar_id), '[[:space:]-]+', '', 'g'));
    if new.scholar_id = '' then new.scholar_id = null; end if;
  end if;
  return new;
end;
$$;

create trigger profiles_normalize before insert or update on public.profiles
for each row execute function private.normalize_profile();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert or update of email on auth.users
for each row execute function private.handle_new_user();

create or replace function private.has_staff_role(required_roles public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_roles sr
    where sr.user_id = (select auth.uid())
      and sr.role = any(required_roles)
  );
$$;

create or replace function private.can_read_application(target_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.applications a
    where a.id = target_application_id
      and (
        a.applicant_id = (select auth.uid())
        or private.has_staff_role(array['admin', 'observer']::public.staff_role[])
        or exists (
          select 1 from public.review_assignments ra
          where ra.application_id = a.id and ra.reviewer_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.interview_bookings ib
          join public.interview_slots ins on ins.id = ib.slot_id
          where ib.application_id = a.id
            and (select auth.uid()) = any(ins.interviewer_ids)
        )
      )
  );
$$;

create or replace function private.can_read_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_profile_id = (select auth.uid())
    or private.has_staff_role(array['admin', 'observer']::public.staff_role[])
    or exists (
      select 1 from public.applications a
      where a.applicant_id = target_profile_id
        and private.can_read_application(a.id)
    );
$$;

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
    select * into applicant from public.profiles where id = new.applicant_id;
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
      select 1
      from public.position_questions q
      where q.position_id = new.position_id and q.is_required
        and not exists (
          select 1 from public.application_answers aa
          where aa.application_id = new.id and aa.question_id = q.id
        )
    ) into required_missing;
    if required_missing then
      raise exception 'Required application answers are missing';
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

create trigger applications_guard
before insert or update on public.applications
for each row execute function private.application_guard();

create or replace function private.audit_application_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data, request_id)
    values (
      (select auth.uid()),
      case when tg_op = 'INSERT' then 'application.created' else 'application.status_changed' end,
      'application',
      new.id,
      case when tg_op = 'UPDATE' then jsonb_build_object('status', old.status) else null end,
      jsonb_build_object('status', new.status),
      nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-request-id'
    );
  end if;
  return new;
end;
$$;

create trigger applications_audit
after insert or update on public.applications
for each row execute function private.audit_application_status();

create or replace function private.booking_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_is_admin boolean := private.has_staff_role(array['admin']::public.staff_role[])
    or coalesce((select auth.role()) = 'service_role', false);
begin
  if tg_op = 'UPDATE' and not actor_is_admin then
    if new.slot_id is distinct from old.slot_id
      or new.application_id is distinct from old.application_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Applicants may only respond to their assigned interview booking';
    end if;
    if new.status not in ('confirmed', 'declined') then
      raise exception 'Invalid applicant interview response';
    end if;
    new.applicant_responded_at = now();
  end if;
  return new;
end;
$$;

create trigger interview_bookings_guard
before update on public.interview_bookings
for each row execute function private.booking_guard();

revoke all on all functions in schema private from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.has_staff_role(public.staff_role[]) to authenticated;
grant execute on function private.can_read_application(uuid) to authenticated;
grant execute on function private.can_read_profile(uuid) to authenticated;
